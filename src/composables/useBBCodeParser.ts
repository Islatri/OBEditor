import { computed, ref, type Ref } from "vue"
import { trimBrTags, generateRandomId } from "@/utils/stringUtils"
import { createBox, createProfileLink, createAudioBox } from "@/utils/htmlGenerators"
import { SIZE_REGEX } from "@/constants/bbcode"
import type { BoxState } from "@/types/bbcode"

interface UseBBCodeParserOptions {
    content: Ref<string>
    boxStates: Ref<BoxState>
    boxCounters: Ref<Record<string, number>>
    resetBoxes: () => void
    refreshKey: Ref<number>
}

export const useBBCodeParser = ({ content, boxStates, boxCounters, resetBoxes, refreshKey }: UseBBCodeParserOptions) => {
    let profileCardCounter = 0

    /**
     * 解析 [box=name]...[/box] 标签
     */
    const parseBoxes = (text: string): string => {
        const boxOpenRegex = /\[box=(.*?)]([\s\S]*)/i
        const boxCloseRegex = /([\s\S]*?)\[\/box]/i
        let match, matchNew, textNew

        while ((match = boxOpenRegex.exec(text))) {
            const boxName = match[1]
            boxCounters.value[boxName] = (boxCounters.value[boxName] || 0) + 1
            textNew = text.substring(0, match.index)

            matchNew = boxCloseRegex.exec(match[2])

            try {
                if (!matchNew) throw new Error("Box not closed")

                let boxContent = matchNew[1]

                // 去除内容开头和结尾的多余 <br>
                boxContent = trimBrTags(boxContent)
                const boxId = generateRandomId("box")
                textNew += createBox(boxName, boxContent, boxId, boxStates.value)
                textNew += text.substring(match.index + 6 + boxName.length + matchNew[0].length)

                text = textNew
            } catch (error) {
                console.error("Box parsing error:", error)
                return text
            }
        }

        return text
    }

    /**
     * 解析 [spoilerbox]...[/spoilerbox] 标签
     */
    const parseSpoilerBoxes = (text: string): string => {
        const spoilerBoxOpenRegex = /\[spoilerbox]([\s\S]*)/i
        const spoilerBoxCloseRegex = /([\s\S]*?)\[\/spoilerbox]/i
        let match, matchNew, textNew

        while ((match = spoilerBoxOpenRegex.exec(text))) {
            textNew = text.substring(0, match.index)

            matchNew = spoilerBoxCloseRegex.exec(match[1])

            try {
                if (!matchNew) throw new Error("Spoilerbox not closed")

                let boxContent = matchNew[1]

                // 去除内容开头和结尾的多余 <br>
                boxContent = trimBrTags(boxContent)
                const boxId = generateRandomId("box")
                textNew += createBox("SPOILER", boxContent, boxId, boxStates.value)
                textNew += text.substring(match.index + 12 + matchNew[0].length)

                text = textNew
            } catch (error) {
                console.error("Spoilerbox parsing error:", error)
                return text
            }
        }

        return text
    }

    /**
     * 解析 BBCode 为 HTML
     */
    const parsedContent = computed(() => {
        // 强制更新
        refreshKey.value

        let html = content.value

        // 重置 box 计数器和 profile 卡片计数器
        resetBoxes()
        profileCardCounter = 0

        // 清除所有旧的 profile 卡片 DOM 元素
        if (typeof document !== "undefined") {
            const oldCards = document.querySelectorAll('[id^="qtip-"]')
            oldCards.forEach((card) => card.remove())
        }

        // 0. 提取代码块内容（防止内部BBCode被解析）
        const codeBlocks: string[] = []

        // 提取 [code] 块
        html = html.replace(/\[code](.*?)\[\/code]/gis, (match, content) => {
            const index = codeBlocks.length
            codeBlocks.push(content)
            return `__CODE_BLOCK_${index}__`
        })

        // 1. 换行处理（最先处理）
        html = html.replace(/\n/g, "<br>")
        html = html.replace(/\[\/heading]<br>/g, "[/heading]")

        // 2. 文本格式标签
        // Bold
        html = html.replace(/\[b](.*?)\[\/b]/gis, "<strong>$1</strong>")

        // Italic
        html = html.replace(/\[i](.*?)\[\/i]/gis, "<em>$1</em>")

        // Underline
        html = html.replace(/\[u](.*?)\[\/u]/gis, "<u>$1</u>")

        // Strikethrough
        html = html.replace(/\[s](.*?)\[\/s]/gis, "<s>$1</s>")
        html = html.replace(/\[strike](.*?)\[\/strike]/gis, "<s>$1</s>")

        // 3. 颜色和大小
        // Color
        html = html.replace(/\[color=(.*?)](.*?)\[\/color]/gis, '<span style="color:$1;">$2</span>')

        // Size (只有50、85、100、150可被渲染)
        html = html.replace(SIZE_REGEX, (match, size, text) => {
            return `<span style="font-size:${size}%;">${text}</span>`
        })

        // 4. 特殊标签
        // Spoiler
        html = html.replace(/\[spoiler](.*?)\[\/spoiler]/gis, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>')

        // Box (复杂处理)
        html = parseBoxes(html)

        // Spoiler Box (固定名称为 SPOILER)
        html = parseSpoilerBoxes(html)

        // Quote
        html = html.replace(/\[quote](.*?)\[\/quote]/gis, (match, content) => {
            return `<blockquote>${trimBrTags(content)}</blockquote>`
        })
        html = html.replace(/\[quote="(.*?)"\](.*?)\[\/quote]/gis, (match, author, content) => {
            return `<blockquote><h4>${author} wrote:</h4>${trimBrTags(content)}</blockquote>`
        })

        // Code（c only）
        html = html.replace(/\[c](.*?)\[\/c]/gis, (match, content) => {
            // 如果包含 <br> 换行，则不解析
            if (content.includes("<br>")) {
                return match
            }
            return `<code>${content}</code>`
        })

        // 5. 布局标签
        // Centre
        html = html.replace(/\[centre](.*?)\[\/centre]/gis, "<center>$1</center>")

        // 6. 链接和媒体
        // URL
        html = html.replace(/\[url](.*?)\[\/url]/gis, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        html = html.replace(/\[url=(.*?)](.*?)\[\/url]/gis, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>')

        // Profile (osu! specific) - 带悬浮卡片
        html = html.replace(/\[profile=(.*?)](.*?)\[\/profile]/gis, (match, userId, username) => {
            const qtipId = profileCardCounter++
            return createProfileLink(userId, username, qtipId)
        })

        // 7. 列表
        // 有序列表 [list=TYPE]（TYPE 可以是任意值）
        html = html.replace(/\[list=([^\]]+)](.*?)\[\/list]/gis, (match, type, content) => {
            return `<ol>${trimBrTags(content)}</ol>`
        })
        // 无序列表 [list]（默认）
        html = html.replace(/\[list](.*?)\[\/list]/gis, (match, content) => {
            return `<ol class="unordered">${trimBrTags(content)}</ol>`
        })
        // 列表项 [*]（同时支持有序和无序列表）
        html = html.replace(/\[\*](.*?)(?=\[\*]|<\/[ou]l>)/gis, "<li>$1</li>")

        // email
        html = html.replace(/\[email=(.*?)](.*?)\[\/email]/gis, '<a href="mailto:$1">$2</a>')

        // Images
        html = html.replace(/\[img](.*?)\[\/img]/gis, '<img src="$1" alt="Image" />')
        html = html.replace(/\[img=(.*?)](.*?)\[\/img]/gis, '<img src="$2" alt="Image" style="max-width: $1px;" />')

        // Youtube
        html = html.replace(/\[youtube](.*?)\[\/youtube]/gis, '<iframe class="u-embed-wide u-embed-wide--bbcode" src="https://www.youtube.com/embed/$1?rel=0" allowfullscreen></iframe>')

        //audio
        html = html.replace(/\[audio](.*?)\[\/audio]/gis, (match, content) => {
            return createAudioBox(content)
        })

        // 8. osu! 特有标签
        // Heading (osu! style)
        html = html.replace(/\[heading](.*?)\[\/heading]/gis, '<h2 class="osu-heading">$1</h2>')

        // Notice (well box)
        html = html.replace(/\[notice](.*?)\[\/notice]/gis, (match, content) => {
            return `<div class="well">${trimBrTags(content)}</div>`
        })

        // 清理多余的 <br> 标签
        html = html.replace(/(<\/div>\s*)<br>/g, "</div>")
        html = html.replace(/(<\/blockquote>\s*)<br>/g, "</blockquote>")

        // 8.5. 自动链接检测（将裸露的URL转换为链接）
        // 匹配不在 HTML 属性内的 http:// 或 https:// URL
        html = html.replace(/(?<!["=])https?:\/\/[^\s<>"]+/gi, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
        })

        // 9. 还原代码块（防止 HTML 渲染）
        // 还原 [code] 块
        codeBlocks.forEach((content, index) => {
            const escapedContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            html = html.replace(`__CODE_BLOCK_${index}__`, `<pre>${trimBrTags(escapedContent)}</pre>`)
        })

        html = html.replace(/(<\/pre>\s*)<br>/g, "</pre>")

        return html
    })

    return {
        parsedContent,
    }
}
