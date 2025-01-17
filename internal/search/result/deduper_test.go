package result

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/sourcegraph/sourcegraph/internal/api"
	"github.com/sourcegraph/sourcegraph/internal/gitserver/gitdomain"
	"github.com/sourcegraph/sourcegraph/internal/types"
)

func TestDeduper(t *testing.T) {
	commit := func(repo, id string) *CommitMatch {
		return &CommitMatch{
			Repo: types.MinimalRepo{
				Name: api.RepoName(repo),
			},
			Commit: gitdomain.Commit{
				ID: api.CommitID(id),
			},
		}
	}

	diff := func(repo, id string) *CommitMatch {
		return &CommitMatch{
			Repo: types.MinimalRepo{
				Name: api.RepoName(repo),
			},
			Commit: gitdomain.Commit{
				ID: api.CommitID(id),
			},
			DiffPreview: &MatchedString{},
		}
	}

	repo := func(name, rev string) *RepoMatch {
		return &RepoMatch{
			Name: api.RepoName(name),
			Rev:  rev,
		}
	}

	file := func(repo, commit, path string, lines []MultilineMatch) *FileMatch {
		return &FileMatch{
			File: File{
				Repo: types.MinimalRepo{
					Name: api.RepoName(repo),
				},
				CommitID: api.CommitID(commit),
				Path:     path,
			},
			MultilineMatches: lines,
		}
	}

	lm := func(s string) MultilineMatch {
		return MultilineMatch{
			Preview: s,
		}
	}

	cases := []struct {
		name     string
		input    Matches
		expected Matches
	}{
		{
			name: "no dups",
			input: []Match{
				commit("a", "b"),
				diff("c", "d"),
				repo("e", "f"),
				file("g", "h", "i", nil),
			},
			expected: []Match{
				commit("a", "b"),
				diff("c", "d"),
				repo("e", "f"),
				file("g", "h", "i", nil),
			},
		},
		{
			name: "merge files",
			input: []Match{
				file("a", "b", "c", []MultilineMatch{lm("a"), lm("b")}),
				file("a", "b", "c", []MultilineMatch{lm("c"), lm("d")}),
			},
			expected: []Match{
				file("a", "b", "c", []MultilineMatch{lm("a"), lm("b"), lm("c"), lm("d")}),
			},
		},
		{
			name: "diff and commit are not equal",
			input: []Match{
				commit("a", "b"),
				diff("a", "b"),
			},
			expected: []Match{
				commit("a", "b"),
				diff("a", "b"),
			},
		},
		{
			name: "different revs not deduped",
			input: []Match{
				repo("a", "b"),
				repo("a", "c"),
			},
			expected: []Match{
				repo("a", "b"),
				repo("a", "c"),
			},
		},
	}

	for _, tc := range cases {
		dedup := NewDeduper()
		for _, match := range tc.input {
			dedup.Add(match)
		}

		require.Equal(t, tc.expected, dedup.Results())
	}
}
