import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, Vibration, View } from 'react-native';
import * as Speech from 'expo-speech';
import { startDeviceRingtone, stopDeviceRingtone } from 'device-ringtone';

import { colors } from '../../theme/colors';

/**
 * Stable id so a duplicate FCM for the same trip+student does not reopen the ring.
 * @param {{ tripId?: string, studentId?: string } | null} call
 */
export function studentStillOnVanCallId(call) {
  // Why: empty call has nothing to dedupe on
  if (!call) return '';
  // Why: one ring per trip (backend table) — tripId alone is enough to dedupe
  if (call.tripId) {
    return String(call.tripId);
  }
  return [call.tripId || '', call.studentId || ''].join('|');
}

/** Good morning / afternoon / evening from the phone clock (English). */
function greetingEnglish() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  return 'Good evening.';
}

/** Same time-of-day greeting in Tamil. */
function greetingTamil() {
  const hour = new Date().getHours();
  if (hour < 12) return 'காலை வணக்கம்.';
  if (hour < 17) return 'மதிய வணக்கம்.';
  return 'மாலை வணக்கம்.';
}

/**
 * Speak English first, then Tamil. Only after the driver taps Answer.
 * @param {{ body?: string, bodyTamil?: string } | null} call
 */
export function speakStudentStillOnVanCall(call) {
  if (!call) return;
  const englishBody =
    call.body || "The student's stop was passed, but they are still on this van.";
  const tamilBody =
    call.bodyTamil ||
    'மாணவரின் நிறுத்தம் கடந்துவிட்டது, ஆனால் அவர்கள் இன்னும் இந்த வாகனத்தில் உள்ளனர்.';
  const english = `${greetingEnglish()} ${englishBody}`;
  const tamil = `${greetingTamil()} ${tamilBody}`;
  Speech.speak(english, {
    language: 'en-IN',
    rate: 1,
    onDone: () => {
      Speech.speak(tamil, { language: 'ta-IN', rate: 0.95 });
    },
  });
}

/**
 * After native Answer (or Expo Go fallback ring): show attended UI + EN→TA TTS.
 * Ringing is normally owned by IncomingAlertCallActivity.
 */
export default function IncomingStudentStillOnVanCall({ call, onReject }) {
  // Why: native Answer sets startAnswered so we skip the JS ringing UI
  const [answered, setAnswered] = useState(Boolean(call?.startAnswered));
  const callId = studentStillOnVanCallId(call);
  const ringingRef = useRef(false);
  const pulseTimerRef = useRef(null);
  const startAnswered = Boolean(call?.startAnswered);

  function clearPulse() {
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
  }

  function stopIncomingRing() {
    ringingRef.current = false;
    clearPulse();
    Vibration.cancel();
    stopDeviceRingtone();
  }

  useEffect(() => {
    if (!callId) {
      setAnswered(false);
      ringingRef.current = false;
      return undefined;
    }

    Speech.stop();
    clearPulse();

    // Why: native Activity already handled Answer — only show TTS here
    if (startAnswered) {
      setAnswered(true);
      ringingRef.current = false;
      stopDeviceRingtone();
      const timer = setTimeout(() => speakStudentStillOnVanCall(call), 250);
      return () => {
        clearTimeout(timer);
        Speech.stop();
      };
    }

    // Why: Expo Go / missing native rebuild — JS modal rings as a fallback
    setAnswered(false);
    ringingRef.current = true;
    Promise.resolve(startDeviceRingtone())
      .catch(() => undefined)
      .then(() => {
        if (!ringingRef.current) return;
        const pulse = () => {
          if (!ringingRef.current) return;
          Vibration.vibrate(600);
          pulseTimerRef.current = setTimeout(pulse, 2000);
        };
        pulseTimerRef.current = setTimeout(pulse, 500);
      });

    return () => {
      ringingRef.current = false;
      clearPulse();
      Vibration.cancel();
      stopDeviceRingtone();
      Speech.stop();
    };
  }, [callId, startAnswered]);

  if (!call) return null;

  const message = `${greetingEnglish()} ${
    call.body || "The student's stop was passed, but they are still on this van."
  }`;
  const messageTamil = `${greetingTamil()} ${
    call.bodyTamil ||
    'மாணவரின் நிறுத்தம் கடந்துவிட்டது, ஆனால் அவர்கள் இன்னும் இந்த வாகனத்தில் உள்ளனர்.'
  }`;

  return (
    <Modal visible animationType="none" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.primaryDark,
          justifyContent: 'center',
          padding: 28,
        }}
      >
        {answered ? (
          <>
            <Text style={{ color: colors.white, fontSize: 16, textAlign: 'center' }}>
              Call attended
            </Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 28,
                fontWeight: '700',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              {call.title || 'Student still on van'}
            </Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 18,
                textAlign: 'center',
                marginTop: 24,
                lineHeight: 26,
              }}
            >
              {message}
            </Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 18,
                textAlign: 'center',
                marginTop: 16,
                lineHeight: 28,
              }}
            >
              {messageTamil}
            </Text>
            <Pressable
              onPress={() => {
                Speech.stop();
                onReject();
              }}
              style={{
                alignSelf: 'center',
                backgroundColor: colors.error,
                borderRadius: 40,
                paddingVertical: 16,
                paddingHorizontal: 28,
                marginTop: 48,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: '700' }}>End</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: colors.white, fontSize: 16, textAlign: 'center' }}>
              Incoming alert call
            </Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 28,
                fontWeight: '700',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              {call.title || 'Student still on van'}
            </Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 15,
                textAlign: 'center',
                marginTop: 20,
                opacity: 0.85,
              }}
            >
              Phone is ringing. Answer to hear the message.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 48 }}>
              <Pressable
                onPress={() => {
                  stopIncomingRing();
                  Speech.stop();
                  onReject();
                }}
                style={{
                  backgroundColor: colors.error,
                  borderRadius: 40,
                  paddingVertical: 16,
                  paddingHorizontal: 28,
                }}
              >
                <Text style={{ color: colors.white, fontWeight: '700' }}>Reject</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  stopIncomingRing();
                  Speech.stop();
                  setAnswered(true);
                  setTimeout(() => speakStudentStillOnVanCall(call), 250);
                }}
                style={{
                  backgroundColor: colors.success,
                  borderRadius: 40,
                  paddingVertical: 16,
                  paddingHorizontal: 28,
                }}
              >
                <Text style={{ color: colors.white, fontWeight: '700' }}>Answer</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

/** Shared call state so the listener and modal stay in sync. */
export function useIncomingStudentStillOnVanCall() {
  const [call, setCall] = useState(null);
  return { call, setCall };
}
