"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadAvatar, validateAvatarFile } from "@/lib/storage/avatar";
import { updateProfile } from "@/lib/data/profile";

type Props = {
  initialDisplayName: string;
  initialBio: string;
  initialAvatarUrl: string | null;
};

export function ProfileForm({
  initialDisplayName,
  initialBio,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl] = useState<string | null>(initialAvatarUrl);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const shownImage = preview ?? avatarUrl;

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handlePickFile(e: ChangeEvent<HTMLInputElement>) {
    setError(null);

    const pickedFile = e.target.files?.[0];
    if (!pickedFile) return;

    const validationError = validateAvatarFile(pickedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(pickedFile);
    setPreview(URL.createObjectURL(pickedFile));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setError(null);

    if (displayName.trim().length === 0) {
      setError("表示名を入力してください。");
      return;
    }

    setLoading(true);

    try {
      let newAvatarUrl: string | undefined = undefined;

      if (file) {
        const uploadResult = await uploadAvatar(file);

        if (!uploadResult.ok) {
          setError(uploadResult.error);
          setLoading(false);
          return;
        }

        newAvatarUrl = uploadResult.url;
      }

      const result = await updateProfile({
        displayName,
        bio,
        ...(newAvatarUrl !== undefined ? { avatarUrl: newAvatarUrl } : {}),
      });

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/mypage");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。接続を確認してください。");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="px-[18px] py-6">
      <h1 className="mb-5 text-xl font-black tracking-tight">
        プロフィール編集
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-[12.5px] font-bold text-error">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col items-center">
        <div className="relative">
          {shownImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownImage}
              alt="アイコンのプレビュー"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-line"
            />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full bg-brand-135 text-3xl font-black text-white">
              {displayName[0] ?? "?"}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-white shadow-md ring-2 ring-white disabled:opacity-60"
            aria-label="画像を選択"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePickFile}
          className="hidden"
          disabled={loading}
        />

        <p className="mt-3 text-[11px] text-ink-sub">
          JPEG / PNG / WebP・2MBまで
        </p>
      </div>

      <label className="mb-1 block text-[12px] font-bold text-ink-sub">
        表示名
      </label>
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={30}
        placeholder="あなたの名前"
        className="mb-1 w-full rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white"
        disabled={loading}
      />
      <p className="mb-4 text-right text-[11px] text-ink-sub">
        {displayName.length}/30
      </p>

      <label className="mb-1 block text-[12px] font-bold text-ink-sub">
        自己紹介
      </label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={200}
        rows={4}
        placeholder="あなたのことや、応援したい夢について教えてください。"
        className="mb-1 w-full resize-none rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white"
        disabled={loading}
      />
      <p className="mb-6 text-right text-[11px] text-ink-sub">{bio.length}/200</p>

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] transition active:scale-[.99] disabled:opacity-60"
      >
        {loading ? "保存中…" : "保存する"}
      </button>

      <button
        type="button"
        onClick={() => router.push("/mypage")}
        disabled={loading}
        className="mt-3 w-full rounded-[14px] border border-line py-3 text-[14px] font-extrabold text-ink-sub disabled:opacity-60"
      >
        キャンセル
      </button>
    </form>
  );
}