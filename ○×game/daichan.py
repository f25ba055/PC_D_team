
import pygame
import sys

# 初期設定
pygame.init()

WIDTH = 600
HEIGHT = 700

screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("○×ゲーム")

clock = pygame.time.Clock()

# 色の設定
WHITE = (255, 255, 255)
BLACK = (30, 30, 30)
GRAY = (180, 180, 180)
BLUE = (60, 130, 230)
RED = (230, 80, 80)
GREEN = (80, 180, 120)

# フォント
font = pygame.font.SysFont("meiryo", 40)
small_font = pygame.font.SysFont("meiryo", 25)

# ゲーム設定
CELL_SIZE = 150
BOARD_X = 75
BOARD_Y = 150

board = [""] * 9
current_player = "○"
game_over = False
winner = None
winning_line = None

# 勝利パターン
win_patterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
]


# 盤面を表示
def draw_board():
    for row in range(3):
        for col in range(3):

            x = BOARD_X + col * CELL_SIZE
            y = BOARD_Y + row * CELL_SIZE

            rect = pygame.Rect(
                x, y, CELL_SIZE, CELL_SIZE
            )

            pygame.draw.rect(
                screen, WHITE, rect
            )

            pygame.draw.rect(
                screen, BLACK, rect, 3
            )

            # ○の表示
            if board[row * 3 + col] == "○":
                pygame.draw.circle(
                    screen,
                    BLUE,
                    rect.center,
                    45,
                    8
                )

            # ×の表示
            elif board[row * 3 + col] == "×":
                pygame.draw.line(
                    screen,
                    RED,
                    (x + 40, y + 40),
                    (x + 110, y + 110),
                    8
                )

                pygame.draw.line(
                    screen,
                    RED,
                    (x + 110, y + 40),
                    (x + 40, y + 110),
                    8
                )


# 勝利判定
def check_win():

    global winning_line

    for pattern in win_patterns:

        a, b, c = pattern

        if (board[a] == board[b] == board[c]
                and board[a] != ""):

            winning_line = pattern
            return board[a]

    return None


# 勝利ラインを表示
def draw_winning_line():

    if winning_line is None:
        return

    start = winning_line[0]
    end = winning_line[2]

    start_x = BOARD_X + (start % 3) * CELL_SIZE + CELL_SIZE // 2
    start_y = BOARD_Y + (start // 3) * CELL_SIZE + CELL_SIZE // 2

    end_x = BOARD_X + (end % 3) * CELL_SIZE + CELL_SIZE // 2
    end_y = BOARD_Y + (end // 3) * CELL_SIZE + CELL_SIZE // 2

    pygame.draw.line(
        screen,
        GREEN,
        (start_x, start_y),
        (end_x, end_y),
        8
    )


# ゲームをリセット
def reset_game():

    global board, current_player
    global game_over, winner, winning_line

    board = [""] * 9
    current_player = "○"
    game_over = False
    winner = None
    winning_line = None


# メインループ
while True:

    screen.fill(WHITE)

    # イベント処理
    for event in pygame.event.get():

        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

        # マウスクリック
        if event.type == pygame.MOUSEBUTTONDOWN:

            mouse_x, mouse_y = event.pos

            # リスタートボタン
            reset_button = pygame.Rect(200, 640, 200, 45)

            if reset_button.collidepoint(mouse_x, mouse_y):
                reset_game()

            # 盤面のクリック
            elif not game_over:

                if (BOARD_X <= mouse_x < BOARD_X + CELL_SIZE * 3
                        and BOARD_Y <= mouse_y < BOARD_Y + CELL_SIZE * 3):

                    col = (mouse_x - BOARD_X) // CELL_SIZE
                    row = (mouse_y - BOARD_Y) // CELL_SIZE

                    index = row * 3 + col

                    # 空いているマスなら記号を配置
                    if board[index] == "":

                        board[index] = current_player

                        # 勝利判定
                        winner = check_win()

                        if winner:
                            game_over = True

                        # 引き分け判定
                        elif "" not in board:
                            game_over = True

                        # プレイヤー交代
                        else:
                            current_player = (
                                "×" if current_player == "○" else "○"
                            )

    # タイトル
    title = font.render("○×ゲーム", True, BLACK)
    screen.blit(title, (210, 40))

    # ターン・結果表示
    if winner:
        message = winner + " の勝利！"

    elif game_over:
        message = "引き分け！"

    else:
        message = current_player + " の番です"

    status = font.render(message, True, BLACK)
    screen.blit(status, status.get_rect(center=(WIDTH // 2, 110)))

    # 盤面描画
    draw_board()

    # 勝利ライン描画
    draw_winning_line()

    # リスタートボタン
    reset_button = pygame.Rect(200, 640, 200, 45)

    pygame.draw.rect(
        screen,
        BLUE,
        reset_button,
        border_radius=10
    )

    button_text = small_font.render(
        "リスタート",
        True,
        WHITE
    )

    screen.blit(
        button_text,
        button_text.get_rect(center=reset_button.center)
    )

    # 画面更新
    pygame.display.update()

    clock.tick(60)
