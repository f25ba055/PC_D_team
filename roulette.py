import math
import random
import tkinter as tk
from tkinter import messagebox


class RouletteApp:

  def __init__(self, root):
    self.root = root
    self.root.title("カスタムルーレット")
    self.root.geometry("760x520")
    self.root.resizable(False, False)
    self.root.configure(bg="#F5F7FA")

    # ルーレットの項目リスト（初期値）
    self.items = ["ラーメン", "カレー", "寿司", "パスタ", "焼肉", "ハンバーガー"]

    # 円盤の配色パレット
    self.colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#FFD166",
        "#45B7D1",
        "#96CEB4",
        "#FF9F1C",
        "#A06CD5",
        "#F78FB3",
        "#3DC1D3",
        "#E77F67",
    ]

    # アニメーション制御用変数
    self.current_angle = 0.0
    self.speed = 0.0
    self.is_spinning = False

    # プリセットデータ
    self.presets = {
        "ランチ": ["ラーメン", "カレー", "寿司", "パスタ", "焼肉", "ハンバーガー"],
        "順番決め": ["1番目", "2番目", "3番目", "4番目"],
        "当たり・ハズレ": ["大当たり！", "ハズレ", "ハズレ", "もう一回", "ハズレ"],
        "Yes / No": ["YES", "NO"],
    }

    self._setup_ui()
    self._refresh_listbox()
    self._draw_wheel()

  def _setup_ui(self):
    # --- 左側：ルーレット盤面エリア ---
    left_frame = tk.Frame(self.root, bg="#F5F7FA")
    left_frame.pack(side=tk.LEFT, padx=20, pady=15, fill=tk.BOTH, expand=True)

    self.result_var = tk.StringVar(value="用語を選んでスタート！")
    result_label = tk.Label(
        left_frame,
        textvariable=self.result_var,
        font=("sans-serif", 16, "bold"),
        bg="#F5F7FA",
        fg="#2D3436",
        wraplength=380,
    )
    result_label.pack(pady=(0, 10))

    self.canvas_size = 380
    self.canvas = tk.Canvas(
        left_frame,
        width=self.canvas_size,
        height=self.canvas_size,
        bg="#F5F7FA",
        highlightthickness=0,
    )
    self.canvas.pack()

    self.spin_btn = tk.Button(
        left_frame,
        text="ルーレットを回す！",
        font=("sans-serif", 14, "bold"),
        bg="#FF6B6B",
        fg="white",
        activebackground="#EE5253",
        activeforeground="white",
        relief=tk.FLAT,
        padx=24,
        pady=8,
        cursor="hand2",
        command=self.start_spin,
    )
    self.spin_btn.pack(pady=(15, 0))

    # --- 右側：用語の選択・編集エリア ---
    right_frame = tk.Frame(
        self.root, bg="white", bd=1, relief=tk.SOLID, padx=15, pady=15
    )
    right_frame.pack(side=tk.RIGHT, padx=(0, 20), pady=20, fill=tk.BOTH)

    tk.Label(
        right_frame,
        text="ルーレットの用語設定",
        font=("sans-serif", 13, "bold"),
        bg="white",
        fg="#2D3436",
    ).pack(anchor=tk.W, pady=(0, 8))

    # プリセット選択ボタン群
    preset_frame = tk.Frame(right_frame, bg="white")
    preset_frame.pack(fill=tk.X, pady=(0, 10))
    tk.Label(
        preset_frame, text="プリセット:", font=("sans-serif", 9), bg="white", fg="#636E72"
    ).pack(anchor=tk.W)

    btn_row = tk.Frame(preset_frame, bg="white")
    btn_row.pack(fill=tk.X, pady=2)
    for name in self.presets:
      tk.Button(
          btn_row,
          text=name,
          font=("sans-serif", 9),
          bg="#DFE6E9",
          fg="#2D3436",
          relief=tk.FLAT,
          padx=6,
          pady=2,
          cursor="hand2",
          command=lambda n=name: self.load_preset(n),
      ).pack(side=tk.LEFT, padx=(0, 4))

    # 用語追加フォーム
    input_frame = tk.Frame(right_frame, bg="white")
    input_frame.pack(fill=tk.X, pady=(5, 8))

    self.entry = tk.Entry(input_frame, font=("sans-serif", 11), width=18)
    self.entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=3)
    self.entry.bind("<Return>", lambda event: self.add_item())

    tk.Button(
        input_frame,
        text="追加",
        font=("sans-serif", 10, "bold"),
        bg="#4ECDC4",
        fg="white",
        relief=tk.FLAT,
        padx=10,
        pady=3,
        cursor="hand2",
        command=self.add_item,
    ).pack(side=tk.LEFT, padx=(6, 0))

    # 登録済み用語リスト
    list_frame = tk.Frame(right_frame, bg="white")
    list_frame.pack(fill=tk.BOTH, expand=True)

    scrollbar = tk.Scrollbar(list_frame)
    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    self.listbox = tk.Listbox(
        list_frame,
        font=("sans-serif", 11),
        selectmode=tk.EXTENDED,
        yscrollcommand=scrollbar.set,
        activestyle="none",
        bd=1,
        relief=tk.SOLID,
    )
    self.listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    scrollbar.config(command=self.listbox.yview)

    # 削除・クリアボタン
    action_frame = tk.Frame(right_frame, bg="white")
    action_frame.pack(fill=tk.X, pady=(10, 0))

    tk.Button(
        action_frame,
        text="選択した用語を削除",
        font=("sans-serif", 10),
        bg="#FF7675",
        fg="white",
        relief=tk.FLAT,
        padx=8,
        pady=4,
        cursor="hand2",
        command=self.delete_selected,
    ).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 4))

    tk.Button(
        action_frame,
        text="全消去",
        font=("sans-serif", 10),
        bg="#B2BEC3",
        fg="white",
        relief=tk.FLAT,
        padx=8,
        pady=4,
        cursor="hand2",
        command=self.clear_all,
    ).pack(side=tk.LEFT)

  def _refresh_listbox(self):
    self.listbox.delete(0, tk.END)
    for item in self.items:
      self.listbox.insert(tk.END, f" ・ {item}")

  def load_preset(self, preset_name):
    if self.is_spinning:
      return
    self.items = list(self.presets[preset_name])
    self._refresh_listbox()
    self._draw_wheel()
    self.result_var.set(f"「{preset_name}」を読み込みました")

  def add_item(self):
    if self.is_spinning:
      return
    text = self.entry.get().strip()
    if not text:
      return
    self.items.append(text)
    self.entry.delete(0, tk.END)
    self._refresh_listbox()
    self._draw_wheel()

  def delete_selected(self):
    if self.is_spinning:
      return
    selected_indices = self.listbox.curselection()
    if not selected_indices:
      messagebox.showinfo("お知らせ", "削除したい用語をリストから選択してください。")
      return
    for idx in reversed(selected_indices):
      del self.items[idx]
    self._refresh_listbox()
    self._draw_wheel()

  def clear_all(self):
    if self.is_spinning:
      return
    self.items.clear()
    self._refresh_listbox()
    self._draw_wheel()
    self.result_var.set("用語を追加してください")

  def _draw_wheel(self):
    self.canvas.delete("all")
    cx = self.canvas_size / 2
    cy = self.canvas_size / 2 + 10
    radius = 165

    n = len(self.items)
    if n == 0:
      self.canvas.create_oval(
          cx - radius,
          cy - radius,
          cx + radius,
          cy + radius,
          fill="#DFE6E9",
          outline="#B2BEC3",
          width=2,
      )
      self.canvas.create_text(
          cx, cy, text="用語がありません", font=("sans-serif", 13), fill="#636E72"
      )
      self._draw_pointer(cx, cy, radius)
      return

    step = 360.0 / n
    font_size = 13 if n <= 6 else (11 if n <= 10 else 9)

    for i, item in enumerate(self.items):
      start_deg = (self.current_angle + i * step) % 360
      color = self.colors[i % len(self.colors)]

      if n == 1:
        self.canvas.create_oval(
            cx - radius,
            cy - radius,
            cx + radius,
            cy + radius,
            fill=color,
            outline="white",
            width=2,
        )
      else:
        self.canvas.create_arc(
            cx - radius,
            cy - radius,
            cx + radius,
            cy + radius,
            start=start_deg,
            extent=step,
            fill=color,
            outline="white",
            width=2,
        )

      # 各扇形の中央に用語を描画
      mid_deg = start_deg + step / 2.0
      rad = math.radians(mid_deg)
      text_r = radius * 0.62 if n > 1 else 0
      tx = cx + text_r * math.cos(rad)
      ty = cy - text_r * math.sin(rad)

      display_text = item if len(item) <= 8 else item[:7] + "…"
      self.canvas.create_text(
          tx,
          ty,
          text=display_text,
          font=("sans-serif", font_size, "bold"),
          fill="white",
      )

    # 中央の飾り円
    self.canvas.create_oval(
        cx - 18,
        cy - 18,
        cx + 18,
        cy + 18,
        fill="white",
        outline="#DFE6E9",
        width=2,
    )

    # 上部の針（ポインター）
    self._draw_pointer(cx, cy, radius)

  def _draw_pointer(self, cx, cy, radius):
    top_y = cy - radius
    self.canvas.create_polygon(
        cx - 12,
        top_y - 16,
        cx + 12,
        top_y - 16,
        cx,
        top_y + 10,
        fill="#2D3436",
        outline="white",
        width=2,
    )

  def start_spin(self):
    if self.is_spinning:
      return
    if len(self.items) < 2:
      messagebox.showwarning("注意", "ルーレットを回すには2つ以上の用語を追加してください。")
      return

    self.is_spinning = True
    self.spin_btn.config(state=tk.DISABLED, bg="#B2BEC3")
    self.result_var.set("抽選中...")
    # 初速をランダムに設定して毎回結果が変わるようにする
    self.speed = random.uniform(22.0, 34.0)
    self._animate()

  def _animate(self):
    if self.speed > 0.15:
      self.current_angle = (self.current_angle + self.speed) % 360
      self.speed *= 0.985  # 徐々に減速
      self._draw_wheel()
      self.root.after(16, self._animate)
    else:
      self.is_spinning = False
      self.spin_btn.config(state=tk.NORMAL, bg="#FF6B6B")
      winner = self._get_winner()
      self.result_var.set(f"🎉 結果：【 {winner} 】")

  def _get_winner(self):
    # 12時の位置（90度）にある扇形を判定
    n = len(self.items)
    step = 360.0 / n
    pointer_deg = 90.0
    for i, item in enumerate(self.items):
      start_deg = (self.current_angle + i * step) % 360
      rel = (pointer_deg - start_deg) % 360
      if 0 <= rel < step:
        return item
    return self.items[0]


if __name__ == "__main__":
  root = tk.Tk()
  app = RouletteApp(root)
  root.mainloop()