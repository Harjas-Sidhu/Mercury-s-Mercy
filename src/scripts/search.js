const searchedFor = new URLSearchParams(window.location.search)
    .get("q")
    ?.toString();
let AlreadyFetched = [];
const searchFields = ["title", "description", "slug"];
const searchInput = document.getElementById("search");
if (searchInput) {
    searchInput.value = searchedFor ? searchedFor : "";
}

const css = `
    .blog-link{
        display: flex;
        width: 20rem;
        height: 25rem;
        background-color: #23262D;
        align-items: center;
        justify-content: center;
        color: white;
        text-decoration: none;
    }
    .blogPost{
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background-color: #23262D;
        align-items: baseline;
        transition: all 200ms ease-in-out;
    }

    .blogPost:hover{
        transform: scale(1.05);
    }
    .blog-image{
        width: 100%;
        height: 50%;
        object-fit: cover;
    }
    .post-handler{
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 35%;
        padding: 2rem;
        line-height: 1.5;
        row-gap: 10%;
    }
    .title{
        font-size: 120%;
        font-weight: 100;
    }
    .description{
        font-size: 80%;
        font-weight: 100;
        color: #666;
        overflow: hidden;
        text-overflow: clip;
    }
    .date-handler{
        width: 100%;
        height: 15%;
        display: flex;
        padding: 0rem 2rem;
    }
    .for-bar{
        border-top: 1px inset #E5E7EB4A;
        display: flex;
        height: 100%;
        width: 100%;
        align-items: flex-end;
        justify-content: flex-end;
        padding-bottom: 0.7rem;
    }
    .date{
        position: relative;
        font-size: 80%;
        font-family: inter, sans-serif;
        padding: 0.25rem 0.5rem;
        display: flex;
        height: 2rem;
        width: 5rem;
        align-items: center;
        justify-content: center;
        z-index: 3;
        border-radius: 0.5rem;
    }
    .date:before{
        position: absolute;
        height: 100%;
        width: 100%;
        content: "";
        margin: -1px;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(247.23deg,#4af2c8 0%,#2f4cb3 100%);
        z-index: -2;
    }
    .date:after {
        position: absolute;
        height: 100%;
        width: 100%;
        inset: 0;
        z-index: -1;
        content: "";
        border-radius: inherit;
        background: #23262d linear-gradient(247.23deg,#4af2c833 0%,#2f4cb333 100%);
    }
`

const style = document.createElement("style");
const head = document.head || document.getElementsByTagName('head')[0];
head.appendChild(style);
if(style.styleSheet){
    style.styleSheet.cssText = css;
}
else{
    style.appendChild(document.createTextNode(css));
}
searchInput.addEventListener("input", async () => {
    const title = document.getElementById("heading");
    if (title) {
        title.innerHTML = `Search results for "${searchInput.value}"`;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("q", searchInput.value);
    window.history.replaceState(null, "", url);
    await show(searchInput.value);
});

function getRelevance(value, keyword) {
    value = value.toLowerCase();
    keyword = keyword.toLowerCase();

    let index = value.indexOf(keyword);
    let word_index = value.indexOf(" " + keyword);

    if (index == 0) return 3;
    else if (word_index != -1) return 2;
    else if (index != -1) return 1;
    else return 0;
}

async function getData(search) {
    const preProcessedResults = [];
    if (search.length === 0) return;
    if (!AlreadyFetched || AlreadyFetched.length == 0) {
        try {
            const res = await fetch("/api/search.json");
            if (!res.ok) {
                throw new Error("Fetch Error!");
            }
            const data = await res.json();
            for (let i in data) {
                AlreadyFetched.push(data[i]);
                for (let u in searchFields) {
                    const relevance = getRelevance(data[i][searchFields[u]], search);
                    if (relevance == 0) continue;
                    preProcessedResults.push({ relevance: relevance, entry: data[i] });
                }
            }
            preProcessedResults.sort((a, b) => a.relevance - b.relevance);
            const results = [
                ...new Set(preProcessedResults.map((res) => res.entry)),
            ];
            return results;
        } catch (e) {
            console.error(e);
        }
    }
    for (let i in AlreadyFetched) {
        for (let u in searchFields) {
            const relevance = getRelevance(
                AlreadyFetched[i][searchFields[u]],
                search
            );
            if (relevance == 0) continue;
            preProcessedResults.push({
                relevance: relevance,
                entry: AlreadyFetched[i],
            });
        }
    }
    preProcessedResults.sort((a, b) => a.relevance - b.relevance);
    const results = [...new Set(preProcessedResults.map((res) => res.entry))];
    return results;
}

async function show(searchedFor) {
    const resultedPosts = await getData(searchedFor ? searchedFor : "");
    const showresults = document.querySelectorAll(".post-container")[0];
    const toShow = document.getElementById("blogPost");
    if (showresults.firstChild) {
        showresults.textContent = "";
    }
    if (resultedPosts) {
        resultedPosts.map(post => {
            const newEle = document.createElement("div");
            newEle.innerHTML = toShow.innerHTML;
            newEle.querySelector(".blog-link").href = `/${post.slug}`;
            newEle.querySelector(".blog-image").src = post.image.url;
            newEle.querySelector(".title").innerHTML = post.title;
            newEle.querySelector(".description").innerHTML = post.description;
            newEle.querySelector(".date").innerHTML = post.date;
            for(let c of newEle.children){
                showresults.appendChild(c);
            }
        })
    }
}
show(searchedFor);
const title = document.getElementById("heading");
if (title) {
    title.innerHTML = `Search results for "${searchedFor}"`;
}