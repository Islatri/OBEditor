<!--
    BBCode 内容显示组件
    负责渲染解析后的 BBCode HTML 内容
-->
<template>
    <div class="flex-1 overflow-y-auto p-6 text-[#ffffff] bbcode preview-content custom-scrollbar" v-html="parsedContent"></div>
</template>

<script setup lang="ts">
import { watch, onMounted } from "vue"
import { useAudioPlayer } from "@/composables/useAudioPlayer"

const props = defineProps<{
    parsedContent: string
}>()

const { initAudioPlayers } = useAudioPlayer()

watch(
    () => props.parsedContent,
    () => {
        setTimeout(() => {
            initAudioPlayers()
        }, 0)
    }
)

onMounted(() => {
    setTimeout(() => {
        initAudioPlayers()
    }, 0)
})
</script>
