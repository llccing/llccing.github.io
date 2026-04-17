import Giscus from "@giscus/react";

export default function Comments() {
  return (
    <div className="mt-8">
      <Giscus
        repo="llccing/llccing.github.io"
        repoId="R_kgDOL98uEQ"
        category="General"
        categoryId="DIC_kwDOL98uEc4C7B0s"
        mapping="pathname"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="preferred_color_scheme"
        lang="zh-CN"
        loading="lazy"
      />
    </div>
  );
}
