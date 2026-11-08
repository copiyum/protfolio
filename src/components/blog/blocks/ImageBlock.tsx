import styles from "../article.module.css";

/* eslint-disable @next/next/no-img-element -- R2 media is resolved through the stable internal asset route. */
export function ImageBlock({
  assetId,
  alt,
  caption,
  wide,
}: {
  assetId: string;
  alt: string;
  caption?: string;
  wide: boolean;
}) {
  return (
    <figure className={styles.image} data-wide={wide}>
      <img src={`/media/blog/${assetId}`} alt={alt} loading="lazy" />
      {caption && (
        <figcaption className={styles.caption}>
          <span>{caption}</span>
          <span>Figure</span>
        </figcaption>
      )}
    </figure>
  );
}
