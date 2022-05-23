import React, { useCallback, useState, useMemo } from 'react'

import * as H from 'history'
import ChartLineIcon from 'mdi-react/ChartLineIcon'
import { of } from 'rxjs'
import { catchError } from 'rxjs/operators'

import { Form } from '@sourcegraph/branded/src/components/Form'
import { asError, isErrorLike, ErrorLike } from '@sourcegraph/common'
import { Badge, LoadingSpinner, useObservable, Alert, Icon, Typography, Input, Button } from '@sourcegraph/wildcard'

import { querySearchResultsStats } from './backend'
import { SearchStatsLanguages } from './SearchStatsLanguages'

interface Props {
    location: H.Location
    history: H.History

    /** Mockable in tests. */
    _querySearchResultsStats?: typeof querySearchResultsStats
}

/**
 * Shows statistics about the results for a search query.
 */
export const SearchStatsPage: React.FunctionComponent<React.PropsWithChildren<Props>> = ({
    location,
    history,
    _querySearchResultsStats = querySearchResultsStats,
}) => {
    const query = new URLSearchParams(location.search).get('q') || ''
    const [uncommittedQuery, setUncommittedQuery] = useState(query)
    const onUncommittedQueryChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(event => {
        setUncommittedQuery(event.currentTarget.value)
    }, [])
    const onSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
        event => {
            event.preventDefault()
            history.push({ ...location, search: new URLSearchParams({ q: uncommittedQuery }).toString() })
        },
        [history, location, uncommittedQuery]
    )

    const DEFAULT_COUNT = 1000
    const queryWithCount = query.includes('count:') ? query : `${query} count:${DEFAULT_COUNT}`

    // TODO(sqs): reuse the user's current patternType
    const stats = useObservable(
        useMemo(
            () => _querySearchResultsStats(queryWithCount).pipe(catchError(error => of<ErrorLike>(asError(error)))),
            [queryWithCount, _querySearchResultsStats]
        )
    )

    return (
        <div className="search-stats-page container mt-4">
            <header className="d-flex align-items-center justify-content-between mb-3">
                <Typography.H2 className="d-flex align-items-center mb-0">
                    <Icon className="mr-2" as={ChartLineIcon} /> Code statistics{' '}
                    <Badge variant="secondary" className="text-uppercase ml-2" as="small">
                        Experimental
                    </Badge>
                </Typography.H2>
            </header>
            <Form onSubmit={onSubmit} className="form">
                <Input
                    id="stats-page__query"
                    className="form-group align-items-stretch"
                    inputClassName="flex-1"
                    type="search"
                    placeholder="Enter a Sourcegraph search query"
                    value={uncommittedQuery}
                    onChange={onUncommittedQueryChange}
                    autoCapitalize="off"
                    spellCheck={false}
                    autoCorrect="off"
                    autoComplete="off"
                    inputSymbol={
                        uncommittedQuery !== query && (
                            <Button type="submit" className="ml-2" variant="primary">
                                Update
                            </Button>
                        )
                    }
                />
            </Form>
            <hr className="my-3" />
            {stats === undefined ? (
                <LoadingSpinner />
            ) : isErrorLike(stats) ? (
                <Alert variant="danger">{stats.message}</Alert>
            ) : stats.limitHit ? (
                <Alert variant="warning">
                    Limit hit. Add <Typography.Code>count:{DEFAULT_COUNT * 5}</Typography.Code> (or an even larger
                    number) to your query to retry with a higher limit.
                </Alert>
            ) : (
                <SearchStatsLanguages query={query} stats={stats} />
            )}
        </div>
    )
}
