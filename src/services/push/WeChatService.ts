import { prisma } from '@/lib/db';

export class WeChatService {
    private corpId = process.env.WECHAT_CORP_ID!;
    private agentId = process.env.WECHAT_AGENT_ID!;
    private secret = process.env.WECHAT_SECRET!;

    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.corpId}&corpsecret=${this.secret}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.errcode !== 0) {
            throw new Error(`Failed to get WeChat token: ${data.errmsg}`);
        }

        this.accessToken = data.access_token;
        // 预留 5 分钟缓冲
        this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
        return this.accessToken as string;
    }

    async sendMarkdown(content: string) {
        const token = await this.getAccessToken();
        const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;

        const payload = {
            touser: '@all',
            msgtype: 'markdown',
            agentid: this.agentId,
            markdown: { content }
        };

        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.errcode !== 0) throw new Error(`WeChat send Error: ${data.errmsg}`);
        return data;
    }

    async sendMpNews(title: string, htmlContent: string, digest: string) {
        const token = await this.getAccessToken();
        const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;

        // MpNews requires uploading the html as article
        const payload = {
            touser: '@all',
            msgtype: 'mpnews',
            agentid: this.agentId,
            mpnews: {
                articles: [
                    {
                        title,
                        thumb_media_id: await this.getPlaceholderMediaId(), // Placeholder 必填
                        author: 'Nexus AI',
                        content_source_url: process.env.NEXT_PUBLIC_BASE_URL || '',
                        content: htmlContent,
                        digest
                    }
                ]
            }
        };

        const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.errcode !== 0) throw new Error(`WeChat sendMpNews Error: ${data.errmsg}`);
        return data;
    }

    // 获取一个临时的素材图 ID，实际部署需实现为上传真正的封面图
    private async getPlaceholderMediaId() {
        // Note: 在实际生产中，mpnews 必须带一个封面图。
        // 为了简化初始化流程，可暂时改用 markdown 类型发送。
        return "YOUR_MEDIA_ID_HERE";
    }
}

export const wechatService = new WeChatService();
