export const PUBLICATION_CONCEPT = process.env.PUBLICATION_CONCEPT;

if (!PUBLICATION_CONCEPT) {
  throw 'PUBLICATION_CONCEPT environment variable cannot be undefined'
}