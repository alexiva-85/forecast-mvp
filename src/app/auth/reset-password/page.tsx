import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">Новый пароль</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Загрузка…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
