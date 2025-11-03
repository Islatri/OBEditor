<template>
    <div class="h-full flex flex-col gap-1">
        <BBCodeHeader @refresh="forceUpdate" />
        <BBCodeContent :parsed-content="parsedContent" />
    </div>
</template>

<script setup lang="ts">
import { ref, toRef, onMounted, onBeforeUnmount } from "vue"
import BBCodeHeader from "./BBCodeHeader.vue"
import BBCodeContent from "./BBCodeContent.vue"
import { useBoxToggle } from "@/composables/useBoxToggle"
import { useUserInfo } from "@/composables/useUserInfo"
import { useBBCodeParser } from "@/composables/useBBCodeParser"
import { useUserCard } from "@/composables/useUserCard"

const props = defineProps<{
    content: string
}>()

const refreshKey = ref(0)

const { boxStates, boxCounters, registerGlobalHandlers, resetBoxes } = useBoxToggle()
const { getFriendshipStatus } = useUserInfo()

const { parsedContent } = useBBCodeParser({
    content: toRef(props, "content"),
    boxStates,
    boxCounters,
    resetBoxes,
    refreshKey,
})

const { registerGlobalHandlers: registerUserCardHandlers, cleanup: cleanupUserCard } = useUserCard(getFriendshipStatus)

const forceUpdate = () => {
    refreshKey.value++
}

onMounted(() => {
    if (typeof window !== "undefined") {
        registerGlobalHandlers()
        registerUserCardHandlers()
    }
})

onBeforeUnmount(() => {
    cleanupUserCard()
})
</script>
