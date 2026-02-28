import { test, expect } from '@playwright/test';

/**
 * ゲーム開始のテスト
 */
test.describe('ゲーム開始', () => {
  test('初級（5件）を選択してゲームを開始できる', async ({ page }) => {
    await page.goto('/nijisanji-thumbnail-quiz/');
    
    // タイトルが表示されている
    await expect(page.locator('h1')).toContainText('YouTube公開時期ソートゲーム');
    
    // 難易度選択ボタンが表示されている
    const easy5Button = page.locator('button:has-text("初級（5件）")');
    await expect(easy5Button).toBeVisible();
    
    // 初級を選択
    await easy5Button.click();
    
    // 5件の動画カードが表示される
    await expect(page.locator('.video-card')).toHaveCount(5);
    
    // 回答をチェックボタンが表示される
    await expect(page.locator('button:has-text("回答をチェック")')).toBeVisible();
  });

  test('上級（10件）を選択してゲームを開始できる', async ({ page }) => {
    await page.goto('/nijisanji-thumbnail-quiz/');
    
    // 上級を選択
    await page.locator('button:has-text("上級（10件）")').click();
    
    // 10件の動画カードが表示される
    await expect(page.locator('.video-card')).toHaveCount(10);
  });
});

/**
 * ドラッグ&ドロップ操作のテスト
 */
test.describe('ドラッグ&ドロップ', () => {
  test('動画カードをドラッグ&ドロップで並び替えできる', async ({ page }) => {
    await page.goto('/nijisanji-thumbnail-quiz/');
    await page.locator('button:has-text("初級（5件）")').click();
    
    // 最初のカードのタイトルを取得
    const firstCard = page.locator('.video-card').first();
    const firstTitle = await firstCard.locator('.video-card-title').textContent();
    
    // 2番目のカードのタイトルを取得
    const secondCard = page.locator('.video-card').nth(1);
    const secondTitle = await secondCard.locator('.video-card-title').textContent();
    
    // 1番目のカードを2番目の位置にドラッグ
    await firstCard.dragTo(secondCard);
    
    // 少し待機（アニメーション）
    await page.waitForTimeout(500);
    
    // 順序が変わったことを確認
    const newFirstTitle = await page.locator('.video-card').first().locator('.video-card-title').textContent();
    expect(newFirstTitle).toBe(secondTitle);
  });
});

/**
 * 結果表示のテスト
 */
test.describe('結果表示', () => {
  test('回答をチェックすると結果が表示される', async ({ page }) => {
    await page.goto('/nijisanji-thumbnail-quiz/');
    await page.locator('button:has-text("初級（5件）")').click();
    
    // 回答をチェックボタンをクリック
    await page.locator('button:has-text("回答をチェック")').click();
    
    // 結果モーダルが表示される
    await expect(page.locator('.result-modal')).toBeVisible();
    
    // 正解率が表示される
    await expect(page.locator('.result-modal')).toContainText('正解率');
    
    // もう一度挑戦ボタンが表示される
    await expect(page.locator('button:has-text("もう一度挑戦")')).toBeVisible();
  });

  test('もう一度挑戦ボタンで再スタートできる', async ({ page }) => {
    await page.goto('/nijisanji-thumbnail-quiz/');
    await page.locator('button:has-text("初級（5件）")').click();
    await page.locator('button:has-text("回答をチェック")').click();
    
    // もう一度挑戦ボタンをクリック
    await page.locator('button:has-text("もう一度挑戦")').click();
    
    // 難易度選択画面に戻る
    await expect(page.locator('button:has-text("初級（5件）")')).toBeVisible();
    await expect(page.locator('button:has-text("上級（10件）")')).toBeVisible();
  });
});

/**
 * レスポンシブデザインのテスト
 */
test.describe('レスポンシブ', () => {
  test('モバイル表示でも正しく動作する', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/nijisanji-thumbnail-quiz/');
    
    // タイトルが表示されている
    await expect(page.locator('h1')).toBeVisible();
    
    // 初級を選択
    await page.locator('button:has-text("初級（5件）")').click();
    
    // 5件の動画カードが表示される
    await expect(page.locator('.video-card')).toHaveCount(5);
    
    // 回答をチェック
    await page.locator('button:has-text("回答をチェック")').click();
    
    // 結果が表示される
    await expect(page.locator('.result-modal')).toBeVisible();
  });
});
