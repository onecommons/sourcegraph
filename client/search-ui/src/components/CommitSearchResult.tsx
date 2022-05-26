import React from 'react'

import { displayRepoName } from '@sourcegraph/shared/src/components/RepoLink'
import { PlatformContextProps } from '@sourcegraph/shared/src/platform/context'
import { CommitMatch, getCommitMatchUrl, getRepositoryUrl } from '@sourcegraph/shared/src/search/stream'
// eslint-disable-next-line no-restricted-imports
import { Timestamp } from '@sourcegraph/web/src/components/time/Timestamp'
import { Link, Typography, useIsTruncated } from '@sourcegraph/wildcard'

import { formatRepositoryStarCount } from '../util/stars'

import { CodeHostIcon } from './CodeHostIcon'
import { CommitSearchResultMatch } from './CommitSearchResultMatch'
import { ResultContainer } from './ResultContainer'
import { SearchResultStar } from './SearchResultStar'

import styles from './SearchResult.module.scss'

interface Props extends PlatformContextProps<'requestGraphQL'> {
    result: CommitMatch
    repoName: string
    icon: React.ComponentType<{ className?: string }>
    onSelect: () => void
    openInNewTab?: boolean
    containerClassName?: string
}

// This is a search result for types diff or commit.
export const CommitSearchResult: React.FunctionComponent<Props> = ({
    result,
    icon,
    repoName,
    platformContext,
    onSelect,
    openInNewTab,
    containerClassName,
}) => {
    /**
     * Use the custom hook useIsTruncated to check if overflow: ellipsis is activated for the element
     * We want to do it on mouse enter as browser window size might change after the element has been
     * loaded initially
     */
    const [titleReference, truncated, checkTruncation] = useIsTruncated()

    const renderTitle = (): JSX.Element => {
        const formattedRepositoryStarCount = formatRepositoryStarCount(result.repoStars)
        return (
            <div className={styles.title}>
                <CodeHostIcon repoName={repoName} className="text-muted flex-shrink-0" />
                <span
                    onMouseEnter={checkTruncation}
                    className="test-search-result-label ml-1 flex-shrink-past-contents text-truncate"
                    ref={titleReference}
                    data-tooltip={(truncated && `${result.authorName}: ${result.message.split('\n', 1)[0]}`) || null}
                >
                    <>
                        <Link to={getRepositoryUrl(result.repository)}>{displayRepoName(result.repository)}</Link>
                        {' › '}
                        <Link to={getCommitMatchUrl(result)}>{result.authorName}</Link>
                        {': '}
                        <Link to={getCommitMatchUrl(result)}>{result.message.split('\n', 1)[0]}</Link>
                    </>
                </span>
                <span className={styles.spacer} />
                <Link to={getCommitMatchUrl(result)}>
                    <Typography.Code className={styles.commitOid}>{result.oid.slice(0, 7)}</Typography.Code>{' '}
                    <Timestamp date={result.authorDate} noAbout={true} strict={true} />
                </Link>
                {formattedRepositoryStarCount && (
                    <>
                        <div className={styles.divider} />
                        <SearchResultStar />
                        {formattedRepositoryStarCount}
                    </>
                )}
            </div>
        )
    }

    const renderBody = (): JSX.Element => (
        <CommitSearchResultMatch
            key={result.url}
            item={result}
            platformContext={platformContext}
            openInNewTab={openInNewTab}
        />
    )

    return (
        <ResultContainer
            icon={icon}
            collapsible={false}
            defaultExpanded={true}
            title={renderTitle()}
            resultType={result.type}
            onResultClicked={onSelect}
            expandedChildren={renderBody()}
            className={containerClassName}
        />
    )
}
