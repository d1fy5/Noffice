import { useContext } from 'react';
import { StoreContext, ThemeContext, ToastContext, SearchContext } from './contexts.js';

export function useStore() {
  return useContext(StoreContext);
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useToast() {
  return useContext(ToastContext);
}

export function useSearch() {
  return useContext(SearchContext);
}