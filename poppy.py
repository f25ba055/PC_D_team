import sqlite3
import tkinter as tk
import uuid
from tkinter import messagebox, ttk

DB_NAME = "todo.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            status TEXT,
            period TEXT,
            deadline TEXT
        )
        """
    )

    columns = {row[1] for row in cur.execute("PRAGMA table_info(todos)")}
    if "period" not in columns:
        cur.execute("ALTER TABLE todos ADD COLUMN period TEXT")
    if "deadline" not in columns:
        cur.execute("ALTER TABLE todos ADD COLUMN deadline TEXT")

    todos = [
        ("workspace-review", "ワークスペース確認", "リポジトリと現在のファイル構成を確認する", "pending"),
        ("task-scope", "目的整理", "依頼内容と必要な対応範囲を整理する", "pending"),
        ("next-plan", "実行計画", "次に行う作業を具体化して進める", "pending"),
    ]

    cur.executemany(
        "INSERT OR IGNORE INTO todos (id, title, description, status) VALUES (?, ?, ?, ?)",
        todos,
    )
    conn.commit()
    conn.close()


class TodoWindow(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("TODOリスト")
        self.geometry("700x400")
        self.minsize(500, 300)

        form = ttk.Frame(self, padding=(10, 10, 10, 0))
        form.pack(fill="x")

        ttk.Label(form, text="タスク名").grid(row=0, column=0, sticky="w")
        self.title_entry = ttk.Entry(form)
        self.title_entry.grid(row=0, column=1, sticky="ew", padx=(8, 0))

        ttk.Label(form, text="説明").grid(row=1, column=0, sticky="w", pady=(6, 0))
        self.description_entry = ttk.Entry(form)
        self.description_entry.grid(
            row=1, column=1, sticky="ew", padx=(8, 0), pady=(6, 0)
        )

        ttk.Label(form, text="期間（例: 2週間）").grid(
            row=2, column=0, sticky="w", pady=(6, 0)
        )
        self.period_entry = ttk.Entry(form)
        self.period_entry.grid(
            row=2, column=1, sticky="ew", padx=(8, 0), pady=(6, 0)
        )

        ttk.Label(form, text="期限（例: 2026-11-30）").grid(
            row=3, column=0, sticky="w", pady=(6, 0)
        )
        self.deadline_entry = ttk.Entry(form)
        self.deadline_entry.grid(
            row=3, column=1, sticky="ew", padx=(8, 0), pady=(6, 0)
        )

        ttk.Button(form, text="タスクを追加", command=self.add_task).grid(
            row=0, column=2, rowspan=4, padx=(8, 0)
        )
        ttk.Button(
            form, text="選択したタスクを削除", command=self.delete_tasks
        ).grid(row=4, column=1, sticky="e", pady=(8, 0))
        form.columnconfigure(1, weight=1)

        self.tree = ttk.Treeview(
            self,
            columns=("title", "description", "period", "deadline"),
            show="headings",
            selectmode="extended",
        )
        self.tree.heading("title", text="タスク名")
        self.tree.heading("description", text="説明")
        self.tree.heading("period", text="期間")
        self.tree.heading("deadline", text="期限")

        self.tree.column("title", width=150)
        self.tree.column("description", width=260)
        self.tree.column("period", width=100)
        self.tree.column("deadline", width=120)

        scroll = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)

        self.tree.pack(fill="both", expand=True, padx=10, pady=(10, 0))
        scroll.pack(fill="y", padx=(0, 10), pady=(10, 10))

        self.refresh()

    def add_task(self):
        title = self.title_entry.get().strip()
        description = self.description_entry.get().strip()
        period = self.period_entry.get().strip()
        deadline = self.deadline_entry.get().strip()

        if not title:
            messagebox.showwarning("入力エラー", "タスク名を入力してください。")
            self.title_entry.focus_set()
            return

        conn = sqlite3.connect(DB_NAME)
        try:
            conn.execute(
                """
                INSERT INTO todos (id, title, description, status, period, deadline)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), title, description, "pending", period, deadline),
            )
            conn.commit()
        finally:
            conn.close()

        self.title_entry.delete(0, tk.END)
        self.description_entry.delete(0, tk.END)
        self.period_entry.delete(0, tk.END)
        self.deadline_entry.delete(0, tk.END)
        self.refresh()

    def delete_tasks(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("選択エラー", "削除するタスクを選択してください。")
            return

        count = len(selected)
        if not messagebox.askyesno(
            "削除の確認", f"選択した {count} 件のタスクを削除しますか？"
        ):
            return

        conn = sqlite3.connect(DB_NAME)
        try:
            conn.executemany(
                "DELETE FROM todos WHERE id = ?",
                ((task_id,) for task_id in selected),
            )
            conn.commit()
        finally:
            conn.close()

        self.refresh()

    def refresh(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        conn = sqlite3.connect(DB_NAME)
        rows = conn.execute(
            "SELECT id, title, description, period, deadline FROM todos ORDER BY id"
        ).fetchall()
        conn.close()

        for task_id, title, description, period, deadline in rows:
            self.tree.insert(
                "",
                "end",
                iid=task_id,
                values=(title, description, period or "", deadline or ""),
            )


if __name__ == "__main__":
    init_db()
    app = TodoWindow()
    app.mainloop()