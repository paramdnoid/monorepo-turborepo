/**
 * @format
 */

jest.mock('../src/config/features', () => ({
  USE_WEBVIEW: false,
}));

import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
