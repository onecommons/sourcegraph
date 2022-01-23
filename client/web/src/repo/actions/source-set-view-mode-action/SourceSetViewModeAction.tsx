import { MenuPopover } from '@reach/menu-button'
import classNames from 'classnames'
import CheckBoldIcon from 'mdi-react/CheckBoldIcon'
import React from 'react'
import { Link } from 'react-router-dom'

import { useQuery, gql } from '@sourcegraph/http-client'
import { FileSpec, RevisionSpec } from '@sourcegraph/shared/src/util/url'
import { Menu, MenuButton, MenuHeader, MenuLink, MenuDivider } from '@sourcegraph/wildcard'
import { MenuItems } from '@sourcegraph/wildcard/src/components/Menu/MenuItems'

import { CatalogComponentIcon } from '../../../enterprise/catalog/components/ComponentIcon'
import { ComponentTitleWithIconAndKind } from '../../../enterprise/catalog/contributions/tree/SourceSetTitle'
import { SourceSetAtTreeViewOptionsProps } from '../../../enterprise/catalog/contributions/tree/useSourceSetAtTreeViewOptions'
import {
    SourceSetViewModeInfoResult,
    SourceSetViewModeInfoVariables,
    RepositoryFields,
} from '../../../graphql-operations'
import { RepoHeaderActionButtonLink } from '../../components/RepoHeaderActions'
import { RepoHeaderContext } from '../../RepoHeader'

import styles from './SourceSetViewModeAction.module.scss'

// TODO(sqs): LICENSE move to enterprise/

// TODO(sqs): should this show up when there is no repository rev?

interface Props extends Partial<RevisionSpec>, Partial<FileSpec> {
    repo: Pick<RepositoryFields, 'id' | 'name'>

    actionType?: 'nav' | 'dropdown'
}

const SOURCE_SET_VIEW_MODE_INFO = gql`
    query SourceSetViewModeInfo($repository: ID!, $path: String!) {
        node(id: $repository) {
            __typename
            ... on Repository {
                id
                components(path: $path, primary: true, recursive: false) {
                    __typename
                    id
                    name
                    kind
                    description
                    url
                }
            }
        }
    }
`

export const SourceSetViewModeAction: React.FunctionComponent<Props & RepoHeaderContext> = props => {
    const { data, error, loading } = useQuery<SourceSetViewModeInfoResult, SourceSetViewModeInfoVariables>(
        SOURCE_SET_VIEW_MODE_INFO,
        {
            variables: { repository: props.repo.id, path: props.filePath || '' },
            fetchPolicy: 'cache-first',
        }
    )
    if (error) {
        throw error
    }
    if (loading && !data) {
        return null
    }

    const components = (data && data.node?.__typename === 'Repository' && data.node.components) ?? null
    if (!components || components.length === 0) {
        return null
    }

    const component = components[0]

    return null

    if (props.actionType === 'dropdown') {
        return (
            <RepoHeaderActionButtonLink to={component.url} className="btn" file={true}>
                <CatalogComponentIcon component={component} className="icon-inline mr-1" /> {component.name}
            </RepoHeaderActionButtonLink>
        )
    }

    return (
        <ComponentActionPopoverButton
            component={component}
            className={styles.wrapper}
            buttonClassName={classNames('btn btn-icon small border border-secondary px-2', styles.btn)}
        />
    )
}

type ComponentFields = Extract<SourceSetViewModeInfoResult['node'], { __typename: 'Repository' }>['components'][number]

export const ComponentActionPopoverButton: React.FunctionComponent<
    {
        component: ComponentFields
        buttonClassName?: string
    } & Pick<SourceSetAtTreeViewOptionsProps, 'sourceSetAtTreeViewMode' | 'sourceSetAtTreeViewModeURL'>
> = ({ component, buttonClassName, sourceSetAtTreeViewMode, sourceSetAtTreeViewModeURL }) => (
    <Menu>
        <MenuButton
            variant="secondary"
            outline={true}
            className={classNames(
                'py-1 px-2',
                styles.btn,
                sourceSetAtTreeViewMode === 'auto' ? styles.btnViewModeComponent : styles.btnViewModeTree,
                buttonClassName
            )}
        >
            <ComponentTitleWithIconAndKind component={component} strong={sourceSetAtTreeViewMode === 'auto'} />
        </MenuButton>
        <SourceSetViewModeActionMenuItems
            sourceSetAtTreeViewMode={sourceSetAtTreeViewMode}
            sourceSetAtTreeViewModeURL={sourceSetAtTreeViewModeURL}
        />
    </Menu>
)

export const SourceSetViewModeActionMenuItems: React.FunctionComponent<
    Pick<SourceSetAtTreeViewOptionsProps, 'sourceSetAtTreeViewMode' | 'sourceSetAtTreeViewModeURL'>
> = ({ sourceSetAtTreeViewMode, sourceSetAtTreeViewModeURL }) => {
    const checkIcon = <CheckBoldIcon className="icon-inline" />
    const noCheckIcon = <CheckBoldIcon className="icon-inline invisible" />

    return (
        <MenuPopover>
            <MenuItems>
                <MenuHeader>View as...</MenuHeader>
                <MenuDivider />
                <MenuLink as={Link} to={sourceSetAtTreeViewModeURL.auto}>
                    {sourceSetAtTreeViewMode === 'auto' ? checkIcon : noCheckIcon} Component
                </MenuLink>
                <MenuLink as={Link} to={sourceSetAtTreeViewModeURL.tree}>
                    {sourceSetAtTreeViewMode === 'tree' ? checkIcon : noCheckIcon} Tree
                </MenuLink>
            </MenuItems>
        </MenuPopover>
    )
}