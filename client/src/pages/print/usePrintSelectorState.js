import { useState } from "react";

/**
 * Keeps page and search query automatically reset whenever `scopeKey` changes
 * without calling setState synchronously inside a useEffect.
 */
export function usePrintSelectorState(scopeKey) {
  const [state, setState] = useState({ key: scopeKey, page: 1, search: "" });
  const page = state.key === scopeKey ? state.page : 1;
  const searchQuery = state.key === scopeKey ? state.search : "";

  const setPage = (nextPage) =>
    setState((prev) => ({
      key: scopeKey,
      page: typeof nextPage === "function" ? nextPage(prev.key === scopeKey ? prev.page : 1) : nextPage,
      search: prev.key === scopeKey ? prev.search : "",
    }));

  const setSearchQuery = (search) =>
    setState((prev) => ({
      key: scopeKey,
      page: prev.key === scopeKey ? prev.page : 1,
      search,
    }));

  return { page, searchQuery, setPage, setSearchQuery };
}
