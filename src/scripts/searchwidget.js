const form = document.querySelectorAll("form")[0];
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const SearchTerm = new FormData(form).get("search")?.toString();
    const url = new URL("/search", window.location.origin);
    url.searchParams.set("q", SearchTerm);
    window.location.assign(url.toString());
})