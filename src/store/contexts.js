import { createContext } from 'react';

export const StoreContext = createContext(null);

export const ThemeContext = createContext(null);

export const ToastContext = createContext(null);

export const SearchContext = createContext({ query: '', setQuery: () => {} });