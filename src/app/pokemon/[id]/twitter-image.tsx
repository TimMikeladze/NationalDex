// Without this, `/pokemon/[id]` inherits the root `twitter-image` and every
// species page shares the generic site card on X.
export {
  alt,
  contentType,
  default,
  generateStaticParams,
  size,
} from "./opengraph-image";
