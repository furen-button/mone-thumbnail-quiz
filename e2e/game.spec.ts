import { test, expect, type Page } from '@playwright/test';

const BASE = '/mone-thumbnail-quiz/';

interface VideoMeta {
  id: string;
  publishedAt: string;
  title: string;
}

/**
 * 画面上の各カードから動画 ID を順番に取り出す
 */
async function readCardIds(page: Page): Promise<string[]> {
  return page.locator('.sortable-item .video-card-thumbnail img').evaluateAll((imgs) =>
    imgs.map((img) => {
      const match = (img as HTMLImageElement).src.match(/([^/]+)\.jpg$/);
      return match ? match[1] : '';
    })
  );
}

/**
 * 初回チュートリアルが表示されている場合に閉じる
 */
async function closeTutorialIfVisible(page: Page) {
  const tutorial = page.locator('.tutorial-modal');
  if (await tutorial.isVisible()) {
    await page.getByRole('button', { name: 'チュートリアルを閉じる' }).click();
    await expect(tutorial).toBeHidden();
  }
}

/**
 * 難易度を選択してゲームを開始
 */
async function startGame(page: Page, difficulty: '初級' | '上級') {
  await page.goto(BASE);
  await page.getByRole('button', { name: new RegExp(difficulty) }).click();
  await page.getByRole('button', { name: 'ゲーム開始' }).click();
  await closeTutorialIfVisible(page);
  await expect(page.locator('.video-card')).toHaveCount(difficulty === '初級' ? 5 : 7);
}

test.describe('メニュー', () => {
  test('タイトル / 難易度 / ゲーム開始 ボタンが表示される', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('.hero-title')).toContainText('サムネイルクイズ');
    await expect(page.getByRole('button', { name: /初級/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /上級/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ゲーム開始' })).toBeVisible();
  });
});

test.describe('ゲーム開始', () => {
  test('初級でゲームを開始すると 5 件のカードが並ぶ', async ({ page }) => {
    await startGame(page, '初級');
    await expect(page.getByRole('button', { name: '回答をチェック' })).toBeVisible();
  });

  test('上級でゲームを開始すると 7 件のカードが並ぶ', async ({ page }) => {
    await startGame(page, '上級');
  });

  test('上級でも標準ビューポート(1280x800)で縦スクロールが発生しない', async ({ page }) => {
    await startGame(page, '上級');
    const overflow = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    // わずかなサブピクセル誤差は許容 (4px)
    expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight + 4);
  });
});

test.describe('操作モード (挿入 / 入れ替え)', () => {
  test('挿入モードではドラッグでカードが押し出される / 入れ替えモードでは 2 枚だけが交換される', async ({
    page,
  }) => {
    // 挿入モード: 1番目 を 3番目の位置にドラッグ → 1番目は3番目へ、2,3番目は1つずつ上にずれる
    await page.goto(BASE);
    await page.getByRole('radio', { name: '挿入' }).click();
    await page.getByRole('button', { name: /初級/ }).click();
    await page.getByRole('button', { name: 'ゲーム開始' }).click();
    await closeTutorialIfVisible(page);
    const before = await readCardIds(page);

    const dragHandle = (i: number) =>
      page.locator('.sortable-item').nth(i).locator('.video-card-drag');
    async function dragByIndex(fromIdx: number, toIdx: number) {
      const from = await dragHandle(fromIdx).boundingBox();
      const to = await dragHandle(toIdx).boundingBox();
      await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
      await page.mouse.down();
      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        const x = from!.x + from!.width / 2 + ((to!.x - from!.x) * i) / steps;
        const y = from!.y + from!.height / 2 + ((to!.y - from!.y) * i) / steps;
        await page.mouse.move(x, y);
      }
      await page.mouse.up();
      await page.waitForTimeout(300);
    }

    await dragByIndex(0, 2);
    const afterInsert = await readCardIds(page);
    // 挿入: [a,b,c,d,e] → [b,c,a,d,e] (0 が 2 に挿入、1,2 が1つ上にずれる)
    expect(afterInsert).toEqual([before[1], before[2], before[0], before[3], before[4]]);

    // メニューに戻って入れ替えモードに
    await page.getByRole('button', { name: '回答をチェック' }).click();
    await page.getByRole('button', { name: 'もう一度挑戦' }).click();
    await page.getByRole('radio', { name: '入れ替え' }).click();
    await page.getByRole('button', { name: /初級/ }).click();
    await page.getByRole('button', { name: 'ゲーム開始' }).click();
    await closeTutorialIfVisible(page);

    const before2 = await readCardIds(page);
    await dragByIndex(0, 2);
    const afterSwap = await readCardIds(page);
    // 入れ替え: [a,b,c,d,e] → [c,b,a,d,e] (0 と 2 だけが交換)
    expect(afterSwap).toEqual([before2[2], before2[1], before2[0], before2[3], before2[4]]);
  });

  test('初期表示では入れ替えモードが選択されている', async ({ page }) => {
    await page.goto(BASE);
    await expect(
      page.getByRole('radio', { name: '入れ替え', checked: true }).first()
    ).toBeVisible();
  });

  test('モード選択は localStorage に保存される', async ({ page }) => {
    await page.goto(BASE);
    // デフォルト (入れ替え) から挿入へ切替 → reload 後も挿入のまま
    await page.getByRole('radio', { name: '挿入' }).first().click();
    await page.reload();
    await expect(
      page.getByRole('radio', { name: '挿入', checked: true }).first()
    ).toBeVisible();
  });
});

test.describe('チュートリアル', () => {
  /** テスト間の localStorage 汚染を防ぐため、tutorial-seen キーだけ削除してリロード */
  async function clearTutorialSeen(page: import('@playwright/test').Page) {
    await page.goto(BASE);
    await page.evaluate(() =>
      localStorage.removeItem('nijisanji-thumbnail-quiz:tutorial-seen:v1')
    );
    await page.reload();
  }

  test('初回ゲーム開始時にチュートリアルが表示される', async ({ page }) => {
    await clearTutorialSeen(page);
    await page.getByRole('button', { name: /初級/ }).click();
    await page.getByRole('button', { name: 'ゲーム開始' }).click();
    await expect(page.locator('.tutorial-modal')).toBeVisible();
    await expect(page.locator('.tutorial-modal')).toContainText('遊び方ガイド');
  });

  test('チュートリアル表示中はタイマーが進まない', async ({ page }) => {
    await clearTutorialSeen(page);
    await page.getByRole('button', { name: /初級/ }).click();
    await page.getByRole('button', { name: 'ゲーム開始' }).click();
    const timer = page.locator('.play-chip.timer .chip-value');
    const before = (await timer.innerText()).trim();
    await page.waitForTimeout(1200);
    await expect(timer).toHaveText(before);
  });

  test('メニューとプレイ中のヘルプで再表示できる', async ({ page }) => {
    await startGame(page, '初級');
    await page.getByRole('button', { name: 'メニューへ' }).click();

    await page.getByRole('button', { name: 'ヘルプ' }).click();
    await expect(page.locator('.tutorial-modal')).toBeVisible();
    await page.getByRole('button', { name: 'チュートリアルを閉じる' }).click();
    await expect(page.locator('.tutorial-modal')).toBeHidden();

    await page.getByRole('button', { name: /初級/ }).click();
    await page.getByRole('button', { name: 'ゲーム開始' }).click();
    await expect(page.locator('.tutorial-modal')).toBeHidden();

    await page.getByRole('button', { name: 'ヘルプ' }).click();
    await expect(page.locator('.tutorial-modal')).toBeVisible();
  });
});

test.describe('▲▼ ボタンでの並び替え', () => {
  test('下のカードを上へ移動すると順序が入れ替わる', async ({ page }) => {
    await startGame(page, '初級');
    const before = await readCardIds(page);
    await page
      .locator('.sortable-item')
      .nth(1)
      .getByRole('button', { name: '上へ移動' })
      .click();
    await page.waitForTimeout(200);
    const after = await readCardIds(page);
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
  });
});

test.describe('ドラッグ&ドロップ', () => {
  test('カードをドラッグして並び替えできる', async ({ page }) => {
    await startGame(page, '初級');
    const before = await readCardIds(page);
    const firstDrag = page.locator('.sortable-item').nth(0).locator('.video-card-drag');
    const secondDrag = page.locator('.sortable-item').nth(1).locator('.video-card-drag');

    // dnd-kit の PointerSensor (distance: 8) を確実に発火させるため
    // 明示的に mouse down → 複数回 move → up のシーケンスで操作する
    const from = await firstDrag.boundingBox();
    const to = await secondDrag.boundingBox();
    expect(from && to).toBeTruthy();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = from!.x + from!.width / 2 + ((to!.x - from!.x) * i) / steps;
      const y = from!.y + from!.height / 2 + ((to!.y - from!.y + to!.height) * i) / steps;
      await page.mouse.move(x, y);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await readCardIds(page);
    expect(after).not.toEqual(before);
  });
});

test.describe('結果表示', () => {
  test('回答をチェックすると結果モーダルとタイムが表示される', async ({ page }) => {
    await startGame(page, '初級');
    await page.getByRole('button', { name: '回答をチェック' }).click();
    await expect(page.locator('.result-modal')).toBeVisible();
    await expect(page.locator('.result-modal')).toContainText('正解率');
    await expect(page.locator('.result-modal')).toContainText('タイム');
    await expect(page.getByRole('button', { name: 'もう一度挑戦' })).toBeVisible();
    await expect(page.getByRole('button', { name: '同じ難易度でもう一回' })).toBeVisible();
  });

  test('もう一度挑戦 でメニューに戻る', async ({ page }) => {
    await startGame(page, '初級');
    await page.getByRole('button', { name: '回答をチェック' }).click();
    await page.getByRole('button', { name: 'もう一度挑戦' }).click();
    await expect(page.getByRole('button', { name: 'ゲーム開始' })).toBeVisible();
  });
});

test.describe('自動プレイ (完璧クリア)', () => {
  test('▲▼ ボタンで正しい順序に並べ替えてパーフェクト', async ({ page }) => {
    // 公開日メタを先に取得 (ブラウザコンテキスト経由で同一オリジン)
    await page.goto(BASE);
    const videos = await page.evaluate<VideoMeta[]>(async () => {
      const res = await fetch('data/videos.json');
      return res.json();
    });
    const byId = new Map(videos.map((v) => [v.id, v]));

    await page.getByRole('button', { name: /初級/ }).click();
    await page.getByRole('button', { name: 'ゲーム開始' }).click();
    await closeTutorialIfVisible(page);
    await expect(page.locator('.video-card')).toHaveCount(5);

    const initialIds = await readCardIds(page);
    const desired = [...initialIds].sort((a, b) => {
      const av = byId.get(a)!.publishedAt;
      const bv = byId.get(b)!.publishedAt;
      return new Date(av).getTime() - new Date(bv).getTime();
    });

    // 単純な選択ソート: i 番目に置きたいカードを ▲ ボタンで持ち上げる
    for (let i = 0; i < desired.length; i++) {
      const current = await readCardIds(page);
      const fromIndex = current.indexOf(desired[i]);
      for (let j = fromIndex; j > i; j--) {
        await page
          .locator('.sortable-item')
          .nth(j)
          .getByRole('button', { name: '上へ移動' })
          .click();
        // アニメーション待ち (dnd-kit の transition)
        await page.waitForTimeout(120);
      }
    }

    // 最終確認
    const finalIds = await readCardIds(page);
    expect(finalIds).toEqual(desired);

    await page.getByRole('button', { name: '回答をチェック' }).click();
    await expect(page.locator('.result-headline')).toContainText('パーフェクト');
    await expect(page.locator('.result-modal')).toContainText('100%');
    // ベスト更新バッジ (初回クリア)
    await expect(page.locator('.best-badge')).toBeVisible();

    // 演出を記録するため少し待機
    await page.waitForTimeout(1500);
  });
});

test.describe('レスポンシブ', () => {
  test('モバイルサイズでも一連の操作が動く', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(BASE);
    await page.getByRole('button', { name: /初級/ }).click();
    await page.getByRole('button', { name: 'ゲーム開始' }).click();
    await closeTutorialIfVisible(page);
    await expect(page.locator('.video-card')).toHaveCount(5);
    await page.getByRole('button', { name: '回答をチェック' }).click();
    await expect(page.locator('.result-modal')).toBeVisible();
  });
});
