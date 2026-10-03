// Synthesized Web Audio Sound Effects for PulseChat
(function (global) {
  'use strict';

  var audioCtx = null;
  var isMuted = localStorage.getItem('pulsechat_muted') === 'true';
  var ringingOscillator = null;
  var ringingInterval = null;

  function getAudioContext() {
    if (!audioCtx) {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Safe wrapper for user interaction to resume audio
  document.addEventListener('click', function () {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }, { once: true });

  var SoundManager = {
    isMuted: function () {
      return isMuted;
    },
    toggleMute: function () {
      isMuted = !isMuted;
      localStorage.setItem('pulsechat_muted', isMuted);
      return isMuted;
    },
    setMuted: function (muted) {
      isMuted = Boolean(muted);
      localStorage.setItem('pulsechat_muted', isMuted);
    },

    // Sent message bubble pop
    playSent: function () {
      if (isMuted) return;
      var ctx = getAudioContext();
      if (!ctx) return;
      try {
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
      } catch (e) {
        console.warn('Audio play error', e);
      }
    },

    // Incoming message chime
    playReceived: function () {
      if (isMuted) return;
      var ctx = getAudioContext();
      if (!ctx) return;
      try {
        var now = ctx.currentTime;

        // Tone 1
        var osc1 = ctx.createOscillator();
        var gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Tone 2
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.1); // A5
        gain2.gain.setValueAtTime(0.2, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.46);
      } catch (e) {
        console.warn('Audio play error', e);
      }
    },

    // Peer connected chime
    playConnected: function () {
      if (isMuted) return;
      var ctx = getAudioContext();
      if (!ctx) return;
      try {
        var now = ctx.currentTime;
        var chord = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        chord.forEach(function (freq, index) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          var t = now + index * 0.07;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.32);
        });
      } catch (e) {
        console.warn('Audio play error', e);
      }
    },

    // Call Ringing
    startRinging: function () {
      if (isMuted || ringingInterval) return;
      var ctx = getAudioContext();
      if (!ctx) return;

      var playRingPulse = function () {
        try {
          var now = ctx.currentTime;
          var osc1 = ctx.createOscillator();
          var osc2 = ctx.createOscillator();
          var gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.setValueAtTime(0.12, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.4);
          osc2.stop(now + 1.4);
        } catch (e) {}
      };

      playRingPulse();
      ringingInterval = setInterval(playRingPulse, 3000);
    },

    stopRinging: function () {
      if (ringingInterval) {
        clearInterval(ringingInterval);
        ringingInterval = null;
      }
    },

    // Hang up tone
    playHangup: function () {
      if (isMuted) return;
      var ctx = getAudioContext();
      if (!ctx) return;
      try {
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } catch (e) {}
    }
  };

  global.SoundManager = SoundManager;
})(window);
