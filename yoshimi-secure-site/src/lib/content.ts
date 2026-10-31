import { getCollection } from "astro:content";

export async function getMembers() {
  return (await getCollection("members")).sort((a, b) => a.data.order - b.data.order);
}

export async function getNews() {
  return (await getCollection("news", (entry) => !entry.data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}
