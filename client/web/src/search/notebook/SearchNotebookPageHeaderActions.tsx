import classNames from 'classnames'
import DomainIcon from 'mdi-react/DomainIcon'
import DotsHorizontalIcon from 'mdi-react/DotsHorizontalIcon'
import LockIcon from 'mdi-react/LockIcon'
import StarIcon from 'mdi-react/StarIcon'
import StarOutlineIcon from 'mdi-react/StarOutlineIcon'
import WebIcon from 'mdi-react/WebIcon'
import React, { useCallback, useMemo, useState } from 'react'
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import { Observable } from 'rxjs'
import { catchError, switchMap, tap } from 'rxjs/operators'

import { TelemetryProps } from '@sourcegraph/shared/src/telemetry/telemetryService'
import { Button, useEventObservable } from '@sourcegraph/wildcard'

import { AuthenticatedUser } from '../../auth'
import { NotebookFields } from '../../graphql-operations'
import { OrgAvatar } from '../../org/OrgAvatar'

import {
    deleteNotebook as _deleteNotebook,
    createNotebookStar as _createNotebookStar,
    deleteNotebookStar as _deleteNotebookStar,
} from './backend'
import { DeleteNotebookModal } from './DeleteNotebookModal'
import { ShareOption } from './NotebookShareOptionsDropdown'
import styles from './SearchNotebookPageHeaderActions.module.scss'
import { ShareNotebookModal } from './ShareNotebookModal'

export interface SearchNotebookPageHeaderActionsProps extends TelemetryProps {
    isSourcegraphDotCom: boolean
    authenticatedUser: AuthenticatedUser | null
    namespace: NotebookFields['namespace']
    notebookId: string
    viewerCanManage: boolean
    isPublic: boolean
    onUpdateVisibility: (isPublic: boolean, namespace: string) => void
    deleteNotebook: typeof _deleteNotebook
    starsCount: number
    viewerHasStarred: boolean
    createNotebookStar: typeof _createNotebookStar
    deleteNotebookStar: typeof _deleteNotebookStar
}

export const SearchNotebookPageHeaderActions: React.FunctionComponent<SearchNotebookPageHeaderActionsProps> = ({
    isSourcegraphDotCom,
    authenticatedUser,
    notebookId,
    viewerCanManage,
    isPublic,
    namespace,
    onUpdateVisibility,
    deleteNotebook,
    starsCount,
    viewerHasStarred,
    createNotebookStar,
    deleteNotebookStar,
    telemetryService,
}) => {
    const [showShareModal, setShowShareModal] = useState(false)
    const toggleShareModal = useCallback(() => setShowShareModal(show => !show), [setShowShareModal])
    const [selectedShareOption, setSelectedShareOption] = useState<ShareOption | null>(
        namespace
            ? {
                  namespaceType: namespace.__typename,
                  namespaceId: namespace.id,
                  namespaceName: namespace.namespaceName,
                  isPublic,
              }
            : null
    )

    const shareIcon = useMemo(() => {
        if (!selectedShareOption) {
            return <></>
        }
        if (selectedShareOption.namespaceType === 'User') {
            const PublicIcon = isSourcegraphDotCom ? WebIcon : DomainIcon
            return selectedShareOption.isPublic ? (
                <PublicIcon className="mr-1" size="1.15rem" />
            ) : (
                <LockIcon className="mr-1" size="1.15rem" />
            )
        }
        return (
            <OrgAvatar org={selectedShareOption.namespaceName} className="d-inline-flex mr-1" size="sm" light={true} />
        )
    }, [selectedShareOption, isSourcegraphDotCom])

    return (
        <div className="d-flex align-items-center">
            <NotebookStarsButton
                disabled={authenticatedUser === null}
                notebookId={notebookId}
                starsCount={starsCount}
                viewerHasStarred={viewerHasStarred}
                createNotebookStar={createNotebookStar}
                deleteNotebookStar={deleteNotebookStar}
                telemetryService={telemetryService}
            />
            {authenticatedUser && viewerCanManage && namespace && selectedShareOption && (
                <>
                    <Button
                        variant="primary"
                        onClick={toggleShareModal}
                        className="d-flex align-items-center"
                        data-testid="share-notebook-button"
                    >
                        {shareIcon} Share
                    </Button>
                    <ShareNotebookModal
                        isOpen={showShareModal}
                        isSourcegraphDotCom={isSourcegraphDotCom}
                        toggleModal={toggleShareModal}
                        telemetryService={telemetryService}
                        authenticatedUser={authenticatedUser}
                        selectedShareOption={selectedShareOption}
                        setSelectedShareOption={setSelectedShareOption}
                        onUpdateVisibility={onUpdateVisibility}
                    />
                </>
            )}
            {viewerCanManage && (
                <NotebookSettingsDropdown
                    notebookId={notebookId}
                    deleteNotebook={deleteNotebook}
                    telemetryService={telemetryService}
                />
            )}
        </div>
    )
}

interface NotebookSettingsDropdownProps extends TelemetryProps {
    notebookId: string
    deleteNotebook: typeof _deleteNotebook
}

const NotebookSettingsDropdown: React.FunctionComponent<NotebookSettingsDropdownProps> = ({
    notebookId,
    deleteNotebook,
    telemetryService,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const toggleOpen = useCallback(() => setIsOpen(previous => !previous), [setIsOpen])

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const toggleDeleteModal = useCallback(() => setShowDeleteModal(show => !show), [setShowDeleteModal])

    return (
        <>
            <ButtonDropdown isOpen={isOpen} toggle={toggleOpen} group={false}>
                <Button tag="button" outline={true} as={DropdownToggle}>
                    <DotsHorizontalIcon />
                </Button>
                <DropdownMenu right={true}>
                    <DropdownItem disabled={true}>Settings</DropdownItem>
                    <DropdownItem divider={true} />
                    <DropdownItem className="btn-danger" onClick={() => setShowDeleteModal(true)}>
                        Delete notebook
                    </DropdownItem>
                </DropdownMenu>
            </ButtonDropdown>
            <DeleteNotebookModal
                notebookId={notebookId}
                isOpen={showDeleteModal}
                toggleDeleteModal={toggleDeleteModal}
                deleteNotebook={deleteNotebook}
                telemetryService={telemetryService}
            />
        </>
    )
}

interface NotebookStarsButtonProps extends TelemetryProps {
    notebookId: string
    disabled: boolean
    starsCount: number
    viewerHasStarred: boolean
    createNotebookStar: typeof _createNotebookStar
    deleteNotebookStar: typeof _deleteNotebookStar
}

const NotebookStarsButton: React.FunctionComponent<NotebookStarsButtonProps> = ({
    notebookId,
    disabled,
    starsCount: initialStarsCount,
    viewerHasStarred: initialViewerHasStarred,
    createNotebookStar,
    deleteNotebookStar,
    telemetryService,
}) => {
    const [starsCount, setStarsCount] = useState(initialStarsCount)
    const [viewerHasStarred, setViewerHasStarred] = useState(initialViewerHasStarred)

    const [onStarToggle] = useEventObservable(
        useCallback(
            (viewerHasStarred: Observable<boolean>) =>
                viewerHasStarred.pipe(
                    // Immediately update the UI.
                    tap(viewerHasStarred => {
                        telemetryService.log(`SearchNotebook${viewerHasStarred ? 'Remove' : 'Add'}Star`)
                        if (viewerHasStarred) {
                            setStarsCount(starsCount => starsCount - 1)
                            setViewerHasStarred(() => false)
                        } else {
                            setStarsCount(starsCount => starsCount + 1)
                            setViewerHasStarred(() => true)
                        }
                    }),
                    switchMap(viewerHasStarred =>
                        viewerHasStarred ? deleteNotebookStar(notebookId) : createNotebookStar(notebookId)
                    ),
                    catchError(() => {
                        setStarsCount(initialStarsCount)
                        setViewerHasStarred(initialViewerHasStarred)
                        return []
                    })
                ),
            [
                deleteNotebookStar,
                notebookId,
                createNotebookStar,
                initialStarsCount,
                initialViewerHasStarred,
                telemetryService,
            ]
        )
    )

    return (
        <Button
            className="d-flex align-items-center"
            outline={true}
            disabled={disabled}
            onClick={() => onStarToggle(viewerHasStarred)}
        >
            {viewerHasStarred ? (
                <StarIcon
                    className={classNames('icon-inline', styles.notebookStarIcon, styles.notebookStarIconActive)}
                />
            ) : (
                <StarOutlineIcon className={classNames('icon-inline', styles.notebookStarIcon)} />
            )}
            <span className="ml-1">{starsCount}</span>
        </Button>
    )
}
