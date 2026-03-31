// Social Media API Configuration & Helpers

export const INSTAGRAM_CONFIG = {
  authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
  graphUrl: 'https://graph.facebook.com/v19.0',
  scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/instagram`,
  appId: process.env.META_APP_ID || '',
  appSecret: process.env.META_APP_SECRET || '',
}

export const TIKTOK_CONFIG = {
  authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  apiUrl: 'https://open.tiktokapis.com/v2',
  scope: 'user.info.basic,video.publish,video.upload',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback/tiktok`,
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
}

// Generate Instagram OAuth URL
export function getInstagramAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: INSTAGRAM_CONFIG.appId,
    redirect_uri: INSTAGRAM_CONFIG.redirectUri,
    scope: INSTAGRAM_CONFIG.scope,
    response_type: 'code',
    state,
  })
  return `${INSTAGRAM_CONFIG.authUrl}?${params}`
}

// Generate TikTok OAuth URL
export function getTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: TIKTOK_CONFIG.clientKey,
    redirect_uri: TIKTOK_CONFIG.redirectUri,
    scope: TIKTOK_CONFIG.scope,
    response_type: 'code',
    state,
  })
  return `${TIKTOK_CONFIG.authUrl}?${params}`
}

// Exchange Instagram code for token
export async function exchangeInstagramCode(code: string): Promise<{
  accessToken: string
  userId: string
  pageId: string
  pageAccessToken: string
  igUserId: string
  accountName: string
} | null> {
  try {
    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch(`${INSTAGRAM_CONFIG.tokenUrl}?` + new URLSearchParams({
      client_id: INSTAGRAM_CONFIG.appId,
      client_secret: INSTAGRAM_CONFIG.appSecret,
      redirect_uri: INSTAGRAM_CONFIG.redirectUri,
      code,
      grant_type: 'authorization_code',
    }))
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) return null

    // Step 2: Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(`${INSTAGRAM_CONFIG.graphUrl}/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: INSTAGRAM_CONFIG.appId,
      client_secret: INSTAGRAM_CONFIG.appSecret,
      fb_exchange_token: tokenData.access_token,
    }))
    const longTokenData = await longTokenRes.json()
    const accessToken = longTokenData.access_token || tokenData.access_token

    // Step 3: Get Facebook Pages
    const pagesRes = await fetch(`${INSTAGRAM_CONFIG.graphUrl}/me/accounts?access_token=${accessToken}`)
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]
    if (!page) return null

    // Step 4: Get Instagram Business Account connected to page
    const igRes = await fetch(`${INSTAGRAM_CONFIG.graphUrl}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
    const igData = await igRes.json()
    const igUserId = igData.instagram_business_account?.id
    if (!igUserId) return null

    // Step 5: Get Instagram account name
    const igProfileRes = await fetch(`${INSTAGRAM_CONFIG.graphUrl}/${igUserId}?fields=username&access_token=${page.access_token}`)
    const igProfile = await igProfileRes.json()

    return {
      accessToken,
      userId: tokenData.user_id || 'unknown',
      pageId: page.id,
      pageAccessToken: page.access_token,
      igUserId,
      accountName: igProfile.username || page.name,
    }
  } catch (err) {
    console.error('Instagram auth error:', err)
    return null
  }
}

// Exchange TikTok code for token
export async function exchangeTikTokCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
  openId: string
} | null> {
  try {
    const res = await fetch(TIKTOK_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: TIKTOK_CONFIG.clientKey,
        client_secret: TIKTOK_CONFIG.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_CONFIG.redirectUri,
      }),
    })
    const data = await res.json()
    if (!data.access_token) return null

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      openId: data.open_id,
    }
  } catch (err) {
    console.error('TikTok auth error:', err)
    return null
  }
}

// Publish Reel to Instagram
export async function publishToInstagram(
  pageAccessToken: string,
  igUserId: string,
  videoUrl: string,
  caption: string
): Promise<{ id: string } | { error: string }> {
  try {
    // Step 1: Create media container
    const createRes = await fetch(`${INSTAGRAM_CONFIG.graphUrl}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        caption,
        media_type: 'REELS',
        access_token: pageAccessToken,
      }),
    })
    const createData = await createRes.json()
    if (createData.error) return { error: createData.error.message }

    const containerId = createData.id

    // Step 2: Wait for processing (poll status)
    let status = 'IN_PROGRESS'
    let attempts = 0
    while (status === 'IN_PROGRESS' && attempts < 30) {
      await new Promise(r => setTimeout(r, 5000)) // Wait 5 seconds
      const statusRes = await fetch(`${INSTAGRAM_CONFIG.graphUrl}/${containerId}?fields=status_code&access_token=${pageAccessToken}`)
      const statusData = await statusRes.json()
      status = statusData.status_code
      attempts++
    }

    if (status !== 'FINISHED') {
      return { error: `Media processing failed: ${status}` }
    }

    // Step 3: Publish
    const publishRes = await fetch(`${INSTAGRAM_CONFIG.graphUrl}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageAccessToken,
      }),
    })
    const publishData = await publishRes.json()
    if (publishData.error) return { error: publishData.error.message }

    return { id: publishData.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Publish Video to TikTok
export async function publishToTikTok(
  accessToken: string,
  videoUrl: string,
  caption: string
): Promise<{ id: string } | { error: string }> {
  try {
    // Step 1: Initialize upload
    const initRes = await fetch(`${TIKTOK_CONFIG.apiUrl}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    })
    const initData = await initRes.json()

    if (initData.error?.code) {
      return { error: initData.error.message || 'TikTok upload failed' }
    }

    return { id: initData.data?.publish_id || 'pending' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
