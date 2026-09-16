"use client";

import { CloneButton } from "@/components/sharing/clone-button";
import { useLists } from "@/hooks/use-lists";
import { cloneSharedList } from "./actions";

export function CloneListButton({ slug }: { slug: string }) {
  const { receiveList } = useLists();
  return (
    <CloneButton
      resource="lists"
      noun="list"
      clone={() => cloneSharedList(slug)}
      receive={receiveList}
    />
  );
}
