import { storiesOf } from '@storybook/react'

import { ExternalServiceKind } from '../../graphql-operations'
import { WebStory } from '../WebStory'

import { ExternalServiceWebhook } from './ExternalServiceWebhook'

const { add } = storiesOf('web/External services/ExternalServiceWebhook', module).addDecorator(story => (
    <WebStory>{() => <div className="p-3 container">{story()}</div>}</WebStory>
))

add('Bitbucket Server', () => (
    <ExternalServiceWebhook
        externalService={{ webhookURL: 'http://test.test/webhook', kind: ExternalServiceKind.BITBUCKETSERVER }}
    />
))
add('GitHub', () => (
    <ExternalServiceWebhook
        externalService={{ webhookURL: 'http://test.test/webhook', kind: ExternalServiceKind.GITHUB }}
    />
))
add(
    'GitLab',
    () => (
        <ExternalServiceWebhook
            externalService={{ webhookURL: 'http://test.test/webhook', kind: ExternalServiceKind.GITLAB }}
        />
    ),
    {
        chromatic: {
            // Visually the same as GitHub
            disable: true,
        },
    }
)
