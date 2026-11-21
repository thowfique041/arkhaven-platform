import { useEffect } from "react";

export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    if (!title) return;
    document.title = title.includes("Arkhaven") ? title : `${title} | Arkhaven Properties`;
    if (description) {
      let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.name = "description";
        document.head.appendChild(m);
      }
      m.content = description;
    }
  }, [title, description]);
}
