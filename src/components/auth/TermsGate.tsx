"use client";

import { useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export function TermsGate({
  agreed,
  onAgreedChange,
}: {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}) {
  const [atBottom, setAtBottom] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = boxRef.current;
    if (!el) return;
    const reachedBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
    if (reachedBottom) setAtBottom(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">📋 使用者權利須知與合作約定</p>
      <p className="text-xs text-muted-foreground">請閱讀並滑至底部後勾選同意，方可進行註冊。</p>

      <div
        ref={boxRef}
        onScroll={handleScroll}
        className="h-80 overflow-y-scroll rounded-lg border border-border bg-muted/40 p-5 text-[0.93rem] leading-7 text-foreground"
      >
        <h4 className="mt-0 font-semibold text-foreground">跨校課程串聯平台：註冊須知與約定事項</h4>
        <p>感謝您加入本平台。為確保校際合作之順暢，請於註冊前詳閱以下事項：</p>

        <p>
          <strong>1. 平台的角色定位：資訊鏈結與輔助</strong>
          <br />
          本平台定位為「教育資源資訊交換中心」，僅提供各校課程需求與開課資訊之展示。平台之功能在於輔助學校發現潛在合作對象，而非課程決策單位。
        </p>

        <p>
          <strong>2. 積極洽談之義務：學校需主動出擊</strong>
          <br />
          本平台採「被動式資訊彙整」模式。相關課程之細節洽談、排課協調及行政作業，需由註冊學校雙方主動聯繫。平台不介入後續的行政決策與過程。
        </p>

        <p>
          <strong>3. 免責聲明：不保證合作成功</strong>
          <br />
          開發者（及平台方）致力於優化資訊鏈結之精準度，但不保證註冊學校一定能達成跨校課程之合作。合作是否成功，取決於各校課程性質、距離、時間及雙方合作意願等客觀因素，開發者不負任何配對成功之保證責任。
        </p>

        <p>
          <strong>4. 資訊真實性責任</strong>
          <br />
          註冊學校應確保上傳至平台之課程資訊、聯繫方式及合作需求皆為真實。若因資訊有誤導致合作受阻或產生行政缺失，應由提供資訊之學校自行負責。
        </p>

        <p>
          <strong>5. 行政主體性原則</strong>
          <br />
          跨校課程之開設應符合教育部（局）相關法規，平台所提供之配對建議僅供參考。所有行政契約、合作備忘錄（MOU）之簽署及學分認定，皆需回歸各校現行行政流程與法規處理。
        </p>

        <p className="mb-0 pb-2 text-[0.85rem] text-muted-foreground">
          ― 已閱讀至本頁底部，請勾選下方同意按鈕繼續 ―
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={agreed}
          disabled={!atBottom}
          onCheckedChange={(v) => onAgreedChange(!!v)}
        />
        我已閱讀並同意以上《使用者權利須知與合作約定》
      </label>

      {!agreed && (
        <p className="text-sm text-muted-foreground">
          ☝️ 請閱讀上方說明並滑至底部，勾選同意後繼續填寫註冊資料。
        </p>
      )}
    </div>
  );
}
