import type { ArticleDocument } from "@/lib/blog/document";
import {
  OptimismLeaseDataSchema,
  ProofBoreholeDataSchema,
  RevisionRaceDataSchema,
} from "@/lib/blog/document";
import { CodeBlock } from "./blocks/CodeBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { OptimismLease } from "./explainers/OptimismLease";
import { ProofBorehole } from "./explainers/ProofBorehole";
import { RevisionRace } from "./explainers/RevisionRace";
import styles from "./article.module.css";

export function ArticleRenderer({ document }: { document: ArticleDocument }) {
  return (
    <div className={styles.body}>
      {document.blocks.map((block) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={block.id} className={styles.paragraph}>
                {block.text}
              </p>
            );
          case "heading": {
            const Tag = `h${block.level}` as "h2" | "h3" | "h4";
            return (
              <div key={block.id} className={styles.sectionHeading}>
                {block.marker && <div className={styles.marker}>{block.marker}</div>}
                <Tag
                  id={block.anchor ?? block.id}
                  className={styles.heading}
                  data-level={block.level}
                >
                  {block.text}
                </Tag>
              </div>
            );
          }
          case "callout":
            return (
              <aside key={block.id} className={styles.callout} data-tone={block.tone}>
                {block.title && <h3>{block.title}</h3>}
                <p>{block.text}</p>
              </aside>
            );
          case "quote":
            return (
              <blockquote key={block.id} className={styles.quote}>
                <p>{block.text}</p>
                {block.attribution && <footer>— {block.attribution}</footer>}
              </blockquote>
            );
          case "code":
            return <CodeBlock key={block.id} {...block} />;
          case "image":
            return <ImageBlock key={block.id} {...block} />;
          case "table":
            return (
              <div key={block.id} className={styles.tableWrap}>
                <table className={styles.table}>
                  {block.caption && <caption>{block.caption}</caption>}
                  <thead>
                    <tr>
                      {block.headers.map((header, index) => (
                        <th key={`${index}-${header}`} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "divider":
            return <hr key={block.id} className={styles.divider} />;
          case "interactive":
            return (
              <div key={block.id} className={styles.explainer}>
                {block.kind === "proof-borehole" ? (
                  <ProofBorehole data={ProofBoreholeDataSchema.parse(block.data)} />
                ) : block.kind === "revision-race" ? (
                  <RevisionRace data={RevisionRaceDataSchema.parse(block.data)} />
                ) : (
                  <OptimismLease data={OptimismLeaseDataSchema.parse(block.data)} />
                )}
              </div>
            );
        }
      })}
    </div>
  );
}
