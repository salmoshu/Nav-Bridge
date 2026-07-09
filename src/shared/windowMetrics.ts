// Main window layout metrics shared between main and renderer.

export const APP_WINDOW_WIDTH = 600;

export const APP_TITLE_BAR_HEIGHT = 38;
export const BOTTOM_ACTION_BAR_HEIGHT = 45;

export const MAIN_CONTAINER_VERTICAL_PADDING = 16; // Container py: 1 * 2
export const ENDPOINT_TABLE_PAPER_PADDING = 16; // Paper p: 1 * 2

export const ENDPOINT_TABLE_HEADER_HEIGHT = 26;
export const ENDPOINT_TABLE_COLUMN_HEADER_HEIGHT = 22;
export const ENDPOINT_TABLE_ADD_BUTTON_HEIGHT = 26;
export const ENDPOINT_TABLE_STACK_SPACING = 6; // Stack spacing: 0.75
export const ENDPOINT_ROW_HEIGHT = 48;

// Small safety margin to avoid showing a vertical scrollbar due to rounding/sub-pixel
// layout differences across DPIs and platforms.
const WINDOW_HEIGHT_SAFETY_MARGIN = 12;

export function mainWindowHeightForEndpointRows(rows: number): number {
  // When there are already 6 streams (input + 5 outputs), the Add Output button is hidden.
  const addButtonVisible = rows < 6;
  // EndpointTable Stack children:
  // header + column header + N rows + [Add button if visible] + bottom ref
  const children = rows + 3 + (addButtonVisible ? 1 : 0);
  const gaps = children - 1;
  const fixed =
    APP_TITLE_BAR_HEIGHT +
    BOTTOM_ACTION_BAR_HEIGHT +
    MAIN_CONTAINER_VERTICAL_PADDING +
    ENDPOINT_TABLE_PAPER_PADDING +
    ENDPOINT_TABLE_HEADER_HEIGHT +
    ENDPOINT_TABLE_COLUMN_HEADER_HEIGHT +
    (addButtonVisible ? ENDPOINT_TABLE_ADD_BUTTON_HEIGHT : 0) +
    ENDPOINT_TABLE_STACK_SPACING * gaps +
    WINDOW_HEIGHT_SAFETY_MARGIN;
  return fixed + rows * ENDPOINT_ROW_HEIGHT;
}
