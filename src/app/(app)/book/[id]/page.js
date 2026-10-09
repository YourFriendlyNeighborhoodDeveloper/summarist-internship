import BookDetails from "@/components/book/BookDetails";

export const metadata = {
  title: "Book",
};

export default async function BookPage({ params }) {
  const { id } = await params;
  return <BookDetails id={id} />;
}
