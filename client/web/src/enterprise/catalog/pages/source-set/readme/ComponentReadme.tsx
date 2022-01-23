import FileDocumentIcon from 'mdi-react/FileDocumentIcon'
import React from 'react'
import { Link } from 'react-router-dom'

import { gql } from '@sourcegraph/http-client'
import { Markdown } from '@sourcegraph/shared/src/components/Markdown'

import { SourceSetReadmeFields } from '../../../../../graphql-operations'

export const SOURCE_SET_README_FRAGMENT = gql`
    fragment SourceSetReadmeFields on SourceSet {
        readme {
            name
            richHTML
            url
        }
    }
`

interface Props {
    readme: NonNullable<SourceSetReadmeFields['readme']>
}

export const SourceSetReadme: React.FunctionComponent<Props> = ({ readme }) => (
    <div className="card mb-3">
        <header className="card-header bg-transparent">
            <h4 className="card-title mb-0 font-weight-bold">
                <Link to={readme.url} className="d-flex align-items-center text-body">
                    <FileDocumentIcon className="icon-inline mr-2" /> {readme.name}
                </Link>
            </h4>
        </header>
        <Markdown dangerousInnerHTML={readme.richHTML} className="card-body p-3" />
    </div>
)