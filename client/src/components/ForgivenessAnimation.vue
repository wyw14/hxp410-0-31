<template>
  <div class="animation-container" v-if="visible">
    <div class="sky">
      <div class="sun"></div>
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
    </div>

    <div class="leaves-container">
      <div
        v-for="leaf in leaves"
        :key="leaf.id"
        class="leaf"
        :style="{
          left: leaf.left + '%',
          animationDelay: leaf.delay + 's',
          animationDuration: leaf.duration + 's',
          fontSize: leaf.size + 'px',
          opacity: leaf.opacity
        }"
      >
        {{ leaf.emoji }}
      </div>
    </div>

    <div class="message-container">
      <transition name="fade" appear>
        <div class="forgiveness-message" v-if="showMessage">
          <p class="main-text">你的秘密已被宽恕</p>
          <p class="sub-text">愿你心中的重担得以卸下</p>
          <p class="sub-text">每一次忏悔都是新生的开始 🍃</p>
        </div>
      </transition>
    </div>

    <div class="ground">
      <div class="grass"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['complete'])

const showMessage = ref(false)
const leaves = ref([])

const leafEmojis = ['🍃', '🌿', '🍂', '🌱', '☘️']

function generateLeaves() {
  const count = 25
  leaves.value = []
  for (let i = 0; i < count; i++) {
    leaves.value.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 4,
      size: 20 + Math.random() * 25,
      opacity: 0.6 + Math.random() * 0.4,
      emoji: leafEmojis[Math.floor(Math.random() * leafEmojis.length)]
    })
  }
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    generateLeaves()
    setTimeout(() => {
      showMessage.value = true
    }, 1500)
    setTimeout(() => {
      emit('complete')
    }, 5000)
  } else {
    showMessage.value = false
  }
})

onMounted(() => {
  if (props.visible) {
    generateLeaves()
  }
})
</script>

<style scoped>
.animation-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #87CEEB 0%, #98D8C8 50%, #7FCDCD 100%);
  overflow: hidden;
  z-index: 1000;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sky {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60%;
}

.sun {
  position: absolute;
  top: 8%;
  right: 15%;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, #FFE066 0%, #FFD700 50%, #FFA500 100%);
  border-radius: 50%;
  box-shadow: 0 0 60px #FFE066, 0 0 100px #FFD700;
  animation: sunPulse 4s ease-in-out infinite;
}

@keyframes sunPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 60px #FFE066, 0 0 100px #FFD700; }
  50% { transform: scale(1.1); box-shadow: 0 0 80px #FFE066, 0 0 120px #FFD700; }
}

.cloud {
  position: absolute;
  background: white;
  border-radius: 50px;
  opacity: 0.8;
}

.cloud::before,
.cloud::after {
  content: '';
  position: absolute;
  background: white;
  border-radius: 50%;
}

.cloud-1 {
  top: 15%;
  left: -150px;
  width: 120px;
  height: 40px;
  animation: cloudMove 25s linear infinite;
}

.cloud-1::before {
  width: 50px;
  height: 50px;
  top: -25px;
  left: 20px;
}

.cloud-1::after {
  width: 70px;
  height: 70px;
  top: -35px;
  left: 50px;
}

.cloud-2 {
  top: 25%;
  right: -180px;
  width: 150px;
  height: 50px;
  animation: cloudMoveReverse 30s linear infinite;
}

.cloud-2::before {
  width: 60px;
  height: 60px;
  top: -30px;
  left: 30px;
}

.cloud-2::after {
  width: 80px;
  height: 80px;
  top: -40px;
  left: 60px;
}

@keyframes cloudMove {
  from { left: -150px; }
  to { left: 110%; }
}

@keyframes cloudMoveReverse {
  from { right: -180px; }
  to { right: 110%; }
}

.leaves-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.leaf {
  position: absolute;
  top: -50px;
  animation: leafFall linear infinite;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.1));
}

@keyframes leafFall {
  0% {
    transform: translateY(-50px) rotate(0deg) translateX(0);
  }
  25% {
    transform: translateY(25vh) rotate(90deg) translateX(30px);
  }
  50% {
    transform: translateY(50vh) rotate(180deg) translateX(-20px);
  }
  75% {
    transform: translateY(75vh) rotate(270deg) translateX(25px);
  }
  100% {
    transform: translateY(105vh) rotate(360deg) translateX(-15px);
  }
}

.message-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
}

.forgiveness-message {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  padding: 50px 60px;
  border-radius: 30px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.main-text {
  font-size: 32px;
  font-weight: 600;
  color: #2d5a4a;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sub-text {
  font-size: 18px;
  color: #555;
  margin-bottom: 10px;
  line-height: 1.8;
}

.ground {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 15%;
  background: linear-gradient(180deg, #7CB342 0%, #558B2F 100%);
}

.grass {
  position: absolute;
  top: -10px;
  left: 0;
  width: 100%;
  height: 20px;
  background: repeating-linear-gradient(
    90deg,
    #8BC34A 0px,
    #8BC34A 3px,
    #7CB342 3px,
    #7CB342 6px
  );
}
</style>
