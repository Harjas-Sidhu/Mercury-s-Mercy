import { getCollection } from "astro:content";

async function getPosts() {
    const allPosts = await getCollection("posts");
    return allPosts.map(post => ({
        slug: post.slug,
        title: post.data.title,
        description: post.data.description,
        image: post.data.image,
        date: post.data.publishDate.toLocaleDateString(),
    }));
}

export async function GET(){
    return new Response(JSON.stringify(await getPosts()), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}