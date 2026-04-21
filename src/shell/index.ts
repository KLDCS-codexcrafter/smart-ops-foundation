/**
 * Public API of @/shell/
 * All products import from here. Internal files are implementation details.
 */
export { Shell } from './Shell';
export { ShellThemeProvider } from './ShellThemeProvider';
export { useShellTheme } from './useShellTheme';
export type {
  ShellConfig, SidebarItem, SidebarItemType, HeaderChip, HeaderChipType,
  ProductId, ThemeAccent, LogoConfig, TenantBrand,
} from './types';
export { ACCENTS } from './theme/accents';
export { filterSidebarByMatrix } from './utils/filterSidebarByMatrix';
export { filterChipsByMatrix } from './utils/filterChipsByMatrix';
