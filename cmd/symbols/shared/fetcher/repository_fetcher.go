package fetcher

import (
	"archive/tar"
	"context"
	"io"
	"strings"

	"github.com/opentracing/opentracing-go/log"

	"github.com/sourcegraph/sourcegraph/cmd/symbols/shared/gitserver"
	sharedtypes "github.com/sourcegraph/sourcegraph/cmd/symbols/shared/types"
	"github.com/sourcegraph/sourcegraph/internal/observation"
	"github.com/sourcegraph/sourcegraph/lib/errors"
)

type RepositoryFetcher interface {
	FetchRepositoryArchive(ctx context.Context, args sharedtypes.SearchArgs, paths []string) <-chan parseRequestOrError
}

type repositoryFetcher struct {
	gitserverClient     gitserver.GitserverClient
	fetchSem            chan int
	operations          *operations
	maxTotalPathsLength int
	shouldRead          func(tarHeader *tar.Header) bool
}

type ParseRequest struct {
	Path string
	Data []byte
}

type parseRequestOrError struct {
	ParseRequest ParseRequest
	Err          error
}

func NewRepositoryFetcher(gitserverClient gitserver.GitserverClient, maximumConcurrentFetches int, maxTotalPathsLength int, observationContext *observation.Context, shouldRead func(tarHeader *tar.Header) bool) RepositoryFetcher {
	return &repositoryFetcher{
		gitserverClient:     gitserverClient,
		fetchSem:            make(chan int, maximumConcurrentFetches),
		operations:          newOperations(observationContext),
		maxTotalPathsLength: maxTotalPathsLength,
		shouldRead:          shouldRead,
	}
}

func (f *repositoryFetcher) FetchRepositoryArchive(ctx context.Context, args sharedtypes.SearchArgs, paths []string) <-chan parseRequestOrError {
	requestCh := make(chan parseRequestOrError)

	go func() {
		defer close(requestCh)

		if err := f.fetchRepositoryArchive(ctx, args, paths, func(request ParseRequest) {
			requestCh <- parseRequestOrError{ParseRequest: request}
		}); err != nil {
			requestCh <- parseRequestOrError{Err: err}
		}
	}()

	return requestCh
}

func (f *repositoryFetcher) fetchRepositoryArchive(ctx context.Context, args sharedtypes.SearchArgs, paths []string, callback func(request ParseRequest)) (err error) {
	ctx, trace, endObservation := f.operations.fetchRepositoryArchive.WithAndLogger(ctx, &err, observation.Args{LogFields: []log.Field{
		log.String("repo", string(args.Repo)),
		log.String("commitID", string(args.CommitID)),
		log.Int("paths", len(paths)),
		log.String("paths", strings.Join(paths, ":")),
	}})
	defer endObservation(1, observation.Args{})

	onDefer, err := f.limitConcurrentFetches(ctx)
	if err != nil {
		return err
	}
	defer onDefer()
	trace.Log(log.Event("acquired fetch semaphore"))

	f.operations.fetching.Inc()
	defer f.operations.fetching.Dec()

	fetchAndRead := func(paths []string) error {
		rc, err := f.gitserverClient.FetchTar(ctx, args.Repo, args.CommitID, paths)
		if err != nil {
			return errors.Wrap(err, "gitserverClient.FetchTar")
		}
		defer rc.Close()

		err = readTar(ctx, tar.NewReader(rc), f.shouldRead, callback, trace)
		if err != nil {
			return errors.Wrap(err, "readTar")
		}

		return nil
	}

	if len(paths) == 0 {
		// Full archive
		return fetchAndRead(nil)
	}

	// Partial archive
	for _, pathBatch := range batchByTotalLength(paths, f.maxTotalPathsLength) {
		err = fetchAndRead(pathBatch)
		if err != nil {
			return err
		}
	}

	return nil
}

// batchByTotalLength returns batches of paths where each batch contains at most maxTotalLength
// characters, except when a single path exceeds the soft max, in which case that long path will be put
// into its own batch.
func batchByTotalLength(paths []string, maxTotalLength int) [][]string {
	batches := [][]string{}
	currentBatch := []string{}
	currentLength := 0

	for _, path := range paths {
		if len(currentBatch) > 0 && currentLength+len(path) > maxTotalLength {
			batches = append(batches, currentBatch)
			currentBatch = []string{}
			currentLength = 0
		}

		currentBatch = append(currentBatch, path)
		currentLength += len(path)
	}

	batches = append(batches, currentBatch)

	return batches
}

func (f *repositoryFetcher) limitConcurrentFetches(ctx context.Context) (func(), error) {
	f.operations.fetchQueueSize.Inc()
	defer f.operations.fetchQueueSize.Dec()

	select {
	case f.fetchSem <- 1:
		return func() { <-f.fetchSem }, nil

	case <-ctx.Done():
		return func() {}, ctx.Err()
	}
}

func readTar(ctx context.Context, tarReader *tar.Reader, shouldRead func(tarHeader *tar.Header) bool, callback func(request ParseRequest), traceLog observation.TraceLogger) error {
	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		tarHeader, err := tarReader.Next()
		if err != nil {
			if err == io.EOF {
				return nil
			}

			return err
		}

		if shouldRead(tarHeader) {
			readTarHeader(tarReader, tarHeader, callback, traceLog)
		}
	}
}

func readTarHeader(tarReader *tar.Reader, tarHeader *tar.Header, callback func(request ParseRequest), trace observation.TraceLogger) error {
	// 32MB is the same size used by io.Copy
	buffer := make([]byte, 32*1024)

	trace.Log(log.Event("reading tar header prefix"))

	// Read first chunk of tar header contents
	n, err := tarReader.Read(buffer)
	if err != nil && err != io.EOF {
		return err
	}
	trace.Log(log.Int("n", n))

	if tarHeader.FileInfo().IsDir() || tarHeader.Typeflag == tar.TypeXGlobalHeader {
		return nil
	}

	// Copy buffer into appropriately-sized slice for return
	data := make([]byte, int(tarHeader.Size))
	copy(data, buffer[:n])

	if n < int(tarHeader.Size) {
		trace.Log(log.Event("reading remaining tar header content"))

		// Read the remaining contents
		if _, err := io.ReadFull(tarReader, data[n:]); err != nil {
			return err
		}
		trace.Log(log.Int("n", int(tarHeader.Size)-n))
	}

	request := ParseRequest{Path: tarHeader.Name, Data: data}
	callback(request)
	return nil
}