import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        // eslint-disable-next-line @next/next/no-img-element
        img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" decoding="async" />,
        a: ({ href, children }) => (
          <a href={href} {...(href?.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
            {children}
          </a>
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
