
import java.util.Random;
import java.util.Scanner;

/**
 * コンソールで遊ぶじゃんけんゲーム。 0:グー 1:チョキ 2:パー を入力して、コンピューターと勝負する。
 */
public class Janken {

    private static final String[] HANDS = {"グー", "チョキ", "パー"};

    public static void main(String[] args) {
        Random random = new Random();

        int win = 0;
        int lose = 0;
        int draw = 0;

        try (Scanner scanner = new Scanner(System.in)) {
            System.out.println("=== じゃんけんゲーム ===");

            while (true) {
                System.out.println();
                System.out.print("手を選んでね (0:グー 1:チョキ 2:パー 9:終了) > ");

                if (!scanner.hasNextLine()) {
                    break;
                }
                String input = scanner.nextLine().trim();

                if (input.equals("9")) {
                    break;
                }

                int player;
                try {
                    player = Integer.parseInt(input);
                } catch (NumberFormatException e) {
                    System.out.println("数字で入力してね！");
                    continue;
                }
                if (player < 0 || player > 2) {
                    System.out.println("0, 1, 2, 9 のどれかを入力してね！");
                    continue;
                }

                int cpu = random.nextInt(3);
                System.out.println("じゃんけん…ぽん！");
                System.out.println("あなた: " + HANDS[player] + " / コンピューター: " + HANDS[cpu]);

                // (player - cpu + 3) % 3 → 0:あいこ 1:負け 2:勝ち
                int result = (player - cpu + 3) % 3;
                switch (result) {
                    case 0 -> {
                        System.out.println("あいこ！");
                        draw++;
                    }
                    case 2 -> {
                        System.out.println("あなたの勝ち！");
                        win++;
                    }
                    default -> {
                        System.out.println("あなたの負け…");
                        lose++;
                    }
                }
                System.out.println("戦績: " + win + "勝 " + lose + "敗 " + draw + "分");
            }

            System.out.println();
            System.out.println("最終戦績: " + win + "勝 " + lose + "敗 " + draw + "分");
            System.out.println("遊んでくれてありがとう！");
        }
    }
}
