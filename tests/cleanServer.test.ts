import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanOne } from '@/lib/cleanServer';

test('google_news 聚合：仅解码 item.url 并输出多媒体标题正文', async () => {
    const input = {
        url: 'https://news.google.com/rss/articles/CBMiTEST?oc=5',
        title: '美国针对中东3小时连发6条撤离令',
        sourceName: '羊城晚报报业集团',
        publishedAt: '2026-03-03T09:16:12.000Z',
        content:
            '<ol>' +
            '<li><a href="https://news.google.com/rss/articles/AAA?oc=5" target="_blank">美国针对中东3小时连发6条撤离令</a>&nbsp;&nbsp;<font color="#6f6f6f">羊城晚报报业集团</font></li>' +
            '<li><a href="https://news.google.com/rss/articles/BBB?oc=5" target="_blank">美从海湾多国撤离非紧急政府人员</a>&nbsp;&nbsp;<font color="#6f6f6f">新浪财经</font></li>' +
            '</ol>',
    };

    const out = await cleanOne(input, {
        decodeGoogleNewsUrl: async () => 'https://news.ycwb.com/ikimvkhtkh/content_53989335.htm',
    });

    assert.equal(out.strategy, 'google_news');
    assert.equal(out.url, 'https://news.ycwb.com/ikimvkhtkh/content_53989335.htm');
    assert.match(out.content, /羊城晚报报业集团：美国针对中东3小时连发6条撤离令/);
    assert.match(out.content, /新浪财经：美从海湾多国撤离非紧急政府人员/);
});

test('懂球帝早报：抽取板块条目并去除“剑南春｜”前缀', async () => {
    const input = {
        url: 'https://www.dongqiudi.com/articles/5693722.html',
        title: '早报：正月十五闹元宵',
        sourceName: '懂球帝',
        publishedAt: '2026-03-02T23:00:00.000Z',
        content:
            '<p>欢迎大家收看3月3日的懂球帝早报。</p>' +
            '<h2 class="dqd-Title-t2-s1">头条新闻</h2>' +
            '<p><a href="https://www.dongqiudi.com/article/5693714">【剑南春｜皇马0-1赫塔费】</a></p>' +
            '<p><a href="https://www.dongqiudi.com/article/5693582">【皇马官方：法国专家确诊姆巴佩左膝扭伤】</a></p>' +
            '<h2 class="dqd-Title-t2-s1">24小时热点新闻</h2>' +
            '<p><a href="https://www.dongqiudi.com/article/5693571">【科贝：拉波尔塔提交了8171份会员签名】</a></p>' +
            '<h2 class="dqd-Title-t2-s1">比赛预告</h2>' +
            '<h2 class="dqd-Title-t2-s2">3月3日 今天</h2>' +
            '<p>16:00 女足亚洲杯小组赛 中国女足vs孟加拉国女足</p>',
    };

    const out = await cleanOne(input, {});

    assert.equal(out.strategy, 'dongqiudi_morning_brief');
    assert.match(out.content, /头条新闻/);
    assert.match(out.content, /皇马0-1赫塔费/);
    assert.doesNotMatch(out.content, /剑南春｜/);
    assert.match(out.content, /https:\/\/www\.dongqiudi\.com\/article\/5693714/);
    assert.match(out.content, /比赛预告/);
    assert.match(out.content, /16:00 女足亚洲杯小组赛/);
});

