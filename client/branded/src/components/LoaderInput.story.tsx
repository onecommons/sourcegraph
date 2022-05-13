import { DecoratorFn, Meta, Story } from '@storybook/react'

import webStyles from '@sourcegraph/web/src/SourcegraphWebApp.scss'
import { Input } from '@sourcegraph/wildcard'

import { BrandedStory } from './BrandedStory'

const decorator: DecoratorFn = story => (
    <div className="container mt-3" style={{ width: 800 }}>
        {story()}
    </div>
)
const config: Meta = {
    title: 'branded/LoaderInput',
    decorators: [decorator],
}

export default config

export const Interactive: Story = () => (
    <BrandedStory styles={webStyles}>{() => <Input status="loading" placeholder="Loader input" />}</BrandedStory>
)
