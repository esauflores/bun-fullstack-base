import { type FormEvent, useState } from "react";
import { auth } from "void/client/react";

import { TEST_USER } from "@/shared/demo.ts";

/**
 * Who's signed in and their role (auth.ts's field, which Void's client doesn't type), with a sign-out button; or a
 * sign-in form, filled in with the test account.
 */
export function Account() {
  const session = auth.useSession();
  const [email, setEmail] = useState(TEST_USER.email);
  const [password, setPassword] = useState(TEST_USER.password);
  const [error, setError] = useState("");

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await auth.signIn.email({ email, password });
    setError(error ? (error.message ?? "Couldn't sign in") : "");
  };

  /**
   * Nothing until the session is known: the server renders without one, and a sign-in form in that HTML has password
   * managers (Bitwarden) offer to fill it while you're already signed in.
   */
  if (session.isPending) return <div className="min-h-[76px] rounded-xl border bg-card" />;

  if (session.data) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-5 py-4">
        <span className="size-2 rounded-full bg-success" />
        <p className="flex-auto text-sm">
          Signed in as <strong>{session.data.user.name}</strong>{" "}
          <span className="font-mono text-muted-foreground">({session.data.user.email})</span>, role{" "}
          <strong>{(session.data.user as { role?: string }).role}</strong>
        </p>
        <button
          type="button"
          onClick={() => auth.signOut()}
          className="min-h-11 cursor-pointer rounded-lg border border-edge px-4 text-sm font-semibold hover:bg-muted"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={signIn} className="flex flex-wrap items-end gap-3 rounded-xl border bg-card px-5 py-4">
      <label className="flex flex-[1_1_220px] flex-col gap-1.5 text-sm">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 rounded-lg border border-edge bg-background px-3 font-mono"
        />
      </label>
      <label className="flex flex-[1_1_160px] flex-col gap-1.5 text-sm">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 rounded-lg border border-edge bg-background px-3 font-mono"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 cursor-pointer rounded-lg bg-brand px-4.5 text-[15px] font-semibold text-brand-foreground"
      >
        Sign in
      </button>
      <p className="basis-full text-sm text-muted-foreground">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <>
            Test account: <code className="font-mono">{TEST_USER.email}</code> /{" "}
            <code className="font-mono">{TEST_USER.password}</code>
          </>
        )}
      </p>
    </form>
  );
}
