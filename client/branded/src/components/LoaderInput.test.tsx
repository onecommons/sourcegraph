import { render } from '@testing-library/react'

import { Input } from '@sourcegraph/wildcard'

describe('LoaderInput', () => {
    it('should render a loading spinner when loading prop is true', () => {
        expect(render(<Input status="loading" />).asFragment()).toMatchSnapshot()
    })

    it('should not render a loading spinner when loading prop is false', () => {
        expect(render(<Input />).asFragment()).toMatchSnapshot()
    })
})
