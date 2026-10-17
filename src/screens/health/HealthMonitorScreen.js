import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import colors from '../../theme/colors';
import WebFooter from '../../components/web/WebFooter';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const STORAGE_KEY = '@unnathi_health_vitals';

const INITIAL_VITALS = [
  {
    id: 'v-1',
    type: 'sugar',
    title: 'Blood Sugar (Fasting)',
    value: '95',
    unit: 'mg/dL',
    subType: 'Fasting',
    status: 'Normal',
    statusColor: '#7BC96F',
    statusBg: '#F2FAF0',
    date: 'Today, 08:30 AM',
    timestamp: Date.now() - 3600000 * 2,
    patient: 'Self',
    notes: 'Morning before breakfast',
  },
  {
    id: 'v-2',
    type: 'bp',
    title: 'Blood Pressure',
    value: '120/80',
    systolic: '120',
    diastolic: '80',
    pulse: '72',
    unit: 'mmHg',
    status: 'Optimal',
    statusColor: '#7BC96F',
    statusBg: '#F2FAF0',
    date: 'Yesterday, 06:15 PM',
    timestamp: Date.now() - 86400000,
    patient: 'Self',
    notes: 'Sitting resting BP',
  },
  {
    id: 'v-3',
    type: 'spo2',
    title: 'Blood Oxygen (SpO2)',
    value: '98',
    unit: '%',
    status: 'Healthy',
    statusColor: '#00C2CB',
    statusBg: '#E0F7FA',
    date: 'Yesterday, 06:15 PM',
    timestamp: Date.now() - 86400000,
    patient: 'Self',
    notes: 'Pulse oximeter reading',
  },
  {
    id: 'v-4',
    type: 'temp',
    title: 'Body Temperature',
    value: '98.4',
    unit: '°F',
    status: 'Normal',
    statusColor: '#7BC96F',
    statusBg: '#F2FAF0',
    date: '28 Aug, 09:00 AM',
    timestamp: Date.now() - 86400000 * 4,
    patient: 'Self',
    notes: 'Digital thermometer',
  },
  {
    id: 'v-5',
    type: 'weight',
    title: 'Weight & BMI',
    value: '68',
    height: "172 cm (5'8\")",
    heightCm: '172',
    heightFt: "5'8\"",
    bmi: '23.0',
    unit: 'kg',
    status: 'Normal BMI',
    statusColor: '#7BC96F',
    statusBg: '#F2FAF0',
    date: '25 Aug, 07:30 AM',
    timestamp: Date.now() - 86400000 * 7,
    patient: 'Self',
    notes: 'Morning weight',
  },
];

const PARAM_CONFIG = {
  sugar: {
    name: 'Blood Sugar',
    icon: 'water',
    iconColor: '#FF7F50',
    bg: '#FFF2ED',
    units: 'mg/dL',
    description: 'Track Fasting, Post-Meal (PP), or Random glucose',
  },
  bp: {
    name: 'Blood Pressure',
    icon: 'heart',
    iconColor: '#FF7F50',
    bg: '#FFF2ED',
    units: 'mmHg',
    description: 'Systolic & Diastolic pressure with pulse',
  },
  spo2: {
    name: 'Oxygen (SpO2)',
    icon: 'pulse',
    iconColor: '#00C2CB',
    bg: '#E0F7FA',
    units: '%',
    description: 'Blood oxygen saturation percentage',
  },
  temp: {
    name: 'Temperature',
    icon: 'thermometer',
    iconColor: '#1E3A8A',
    bg: '#E0F7FA',
    units: '°F',
    description: 'Body temperature from home thermometer',
  },
  weight: {
    name: 'Weight & BMI',
    icon: 'scale',
    iconColor: '#7BC96F',
    bg: '#F2FAF0',
    units: 'kg',
    description: 'Body mass & calculated BMI',
  },
};

const HealthMonitorScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const [vitalsList, setVitalsList] = useState(INITIAL_VITALS);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [activePatient, setActivePatient] = useState('Self');
  const [familyOptions, setFamilyOptions] = useState(['Self']);

  // Modal Form State
  const [formType, setFormType] = useState('sugar');
  const [sugarVal, setSugarVal] = useState('');
  const [sugarContext, setSugarContext] = useState('Fasting');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulseVal, setPulseVal] = useState('');
  const [spo2Val, setSpo2Val] = useState('');
  const [tempVal, setTempVal] = useState('');
  const [weightVal, setWeightVal] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm'); // 'cm' | 'ft'
  const [heightVal, setHeightVal] = useState('170');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('7');
  const [notesVal, setNotesVal] = useState('');

  // Height conversion helpers
  const convertCmToFtIn = (cm) => {
    const num = parseFloat(cm);
    if (isNaN(num) || num <= 0) return { feet: '5', inches: '7' };
    const totalInches = num / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet: feet.toString(), inches: inches.toString() };
  };

  const convertFtInToCm = (ft, inc) => {
    const f = parseFloat(ft) || 0;
    const i = parseFloat(inc) || 0;
    const totalInches = f * 12 + i;
    const cm = Math.round(totalInches * 2.54);
    return cm.toString();
  };

  const handleHeightCmChange = (text) => {
    setHeightVal(text);
    const { feet, inches } = convertCmToFtIn(text);
    setHeightFeet(feet);
    setHeightInches(inches);
  };

  const handleHeightFeetChange = (text) => {
    setHeightFeet(text);
    const cm = convertFtInToCm(text, heightInches);
    setHeightVal(cm);
  };

  const handleHeightInchesChange = (text) => {
    setHeightInches(text);
    const cm = convertFtInToCm(heightFeet, text);
    setHeightVal(cm);
  };

  const handleUnitToggle = (unit) => {
    setHeightUnit(unit);
    if (unit === 'ft') {
      const { feet, inches } = convertCmToFtIn(heightVal);
      setHeightFeet(feet);
      setHeightInches(inches);
    } else {
      const cm = convertFtInToCm(heightFeet, heightInches);
      setHeightVal(cm);
    }
  };

  // Load from AsyncStorage
  useEffect(() => {
    loadSavedVitals();
  }, []);

  const loadSavedVitals = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVitalsList(parsed);
        }
      }
      const storedFamily = await AsyncStorage.getItem('@unnathi_family_members');
      if (storedFamily) {
        try {
          const parsedFam = JSON.parse(storedFamily);
          if (Array.isArray(parsedFam) && parsedFam.length > 0) {
            const opts = parsedFam.map((m) => {
              if (m.isPrimary || m.relation === 'Self' || m.id === 'self') return 'Self';
              return `${m.name.split(' ')[0]} (${m.relation})`;
            });
            setFamilyOptions(opts);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log('Error loading vitals:', e);
    }
  };

  const saveVitals = async (newList) => {
    try {
      setVitalsList(newList);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.log('Error saving vitals:', e);
    }
  };

  // Status Evaluation Helpers
  const evaluateSugar = (val, context) => {
    const num = parseFloat(val);
    if (isNaN(num)) return { status: 'Unknown', color: '#64748B', bg: '#F1F5F9' };
    if (context === 'Fasting') {
      if (num < 70) return { status: 'Low (Hypoglycemia)', color: '#FF7F50', bg: '#FFF2ED' };
      if (num <= 99) return { status: 'Normal', color: '#7BC96F', bg: '#F2FAF0' };
      if (num <= 125) return { status: 'Pre-diabetes Range', color: '#64748B', bg: '#F1F5F9' };
      return { status: 'High (Diabetic Range)', color: '#FF7F50', bg: '#FFF2ED' };
    } else {
      // Post-Meal / Random
      if (num < 70) return { status: 'Low Glucose', color: '#FF7F50', bg: '#FFF2ED' };
      if (num <= 140) return { status: 'Normal', color: '#7BC96F', bg: '#F2FAF0' };
      if (num <= 199) return { status: 'Elevated Range', color: '#64748B', bg: '#F1F5F9' };
      return { status: 'High Glucose', color: '#FF7F50', bg: '#FFF2ED' };
    }
  };

  const evaluateBP = (sys, dia) => {
    const s = parseInt(sys, 10);
    const d = parseInt(dia, 10);
    if (isNaN(s) || isNaN(d)) return { status: 'Unknown', color: '#64748B', bg: '#F1F5F9' };
    if (s < 90 || d < 60) return { status: 'Low BP (Hypotension)', color: '#1E3A8A', bg: '#E0F7FA' };
    if (s <= 120 && d <= 80) return { status: 'Optimal / Normal', color: '#7BC96F', bg: '#F2FAF0' };
    if (s <= 129 && d <= 80) return { status: 'Elevated BP', color: '#64748B', bg: '#F1F5F9' };
    if (s <= 139 || d <= 89) return { status: 'Stage 1 Hypertension', color: '#FF7F50', bg: '#FFF2ED' };
    return { status: 'Stage 2 High BP', color: '#FF7F50', bg: '#FFF2ED' };
  };

  const evaluateSpO2 = (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return { status: 'Unknown', color: '#64748B', bg: '#F1F5F9' };
    if (num >= 95) return { status: 'Healthy & Normal', color: '#7BC96F', bg: '#F2FAF0' };
    if (num >= 90) return { status: 'Mild Hypoxia - Monitor', color: '#64748B', bg: '#F1F5F9' };
    return { status: 'Low - Consult Doctor', color: '#FF7F50', bg: '#FFF2ED' };
  };

  const evaluateTemp = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return { status: 'Unknown', color: '#64748B', bg: '#F1F5F9' };
    if (num <= 97.0) return { status: 'Slightly Low', color: '#1E3A8A', bg: '#E0F7FA' };
    if (num <= 99.0) return { status: 'Normal', color: '#7BC96F', bg: '#F2FAF0' };
    if (num <= 100.4) return { status: 'Low-grade Fever', color: '#FF7F50', bg: '#FFF2ED' };
    return { status: 'Fever', color: '#FF7F50', bg: '#FFF2ED' };
  };

  const evaluateBMI = (weightKg, heightCm) => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (isNaN(w) || isNaN(h) || h <= 0) return { bmi: '22.0', status: 'Normal', color: '#7BC96F', bg: '#F2FAF0' };
    const bmiVal = (w / (h * h)).toFixed(1);
    const num = parseFloat(bmiVal);
    if (num < 18.5) return { bmi: bmiVal, status: 'Underweight', color: '#1E3A8A', bg: '#EFF6FF' };
    if (num <= 24.9) return { bmi: bmiVal, status: 'Normal BMI', color: '#7BC96F', bg: '#F2FAF0' };
    if (num <= 29.9) return { bmi: bmiVal, status: 'Overweight', color: '#FF7F50', bg: '#FFF2ED' };
    return { bmi: bmiVal, status: 'Obese Range', color: '#FF7F50', bg: '#FFF2ED' };
  };

  // Get Latest Values for Dashboard Cards
  const latestVitals = useMemo(() => {
    const getLatest = (type) => vitalsList.find((v) => v.type === type);
    const latestWeightItem = getLatest('weight');
    let weightHeightInfo = { cm: '172', ft: "5'8\"", display: "172 cm (5'8\")" };
    if (latestWeightItem) {
      if (latestWeightItem.heightCm) {
        const ftIn = convertCmToFtIn(latestWeightItem.heightCm);
        weightHeightInfo = {
          cm: String(latestWeightItem.heightCm),
          ft: `${ftIn.feet}'${ftIn.inches}"`,
          display: `${latestWeightItem.heightCm} cm (${ftIn.feet}'${ftIn.inches}")`,
        };
      } else if (latestWeightItem.height) {
        const numericMatch = String(latestWeightItem.height).match(/\d+/);
        if (numericMatch) {
          const cmVal = numericMatch[0];
          const ftIn = convertCmToFtIn(cmVal);
          weightHeightInfo = {
            cm: cmVal,
            ft: `${ftIn.feet}'${ftIn.inches}"`,
            display: `${cmVal} cm (${ftIn.feet}'${ftIn.inches}")`,
          };
        }
      }
    }

    return {
      sugar: getLatest('sugar') || { value: '--', unit: 'mg/dL', status: 'Not logged', statusColor: '#94A3B8' },
      bp: getLatest('bp') || { value: '--/--', unit: 'mmHg', status: 'Not logged', statusColor: '#94A3B8' },
      spo2: getLatest('spo2') || { value: '--', unit: '%', status: 'Not logged', statusColor: '#94A3B8' },
      temp: getLatest('temp') || { value: '--', unit: '°F', status: 'Not logged', statusColor: '#94A3B8' },
      weight: latestWeightItem
        ? { ...latestWeightItem, heightInfo: weightHeightInfo }
        : { value: '--', unit: 'kg', bmi: '--', status: 'Not logged', statusColor: '#94A3B8', heightInfo: weightHeightInfo },
    };
  }, [vitalsList]);

  // Filtered History
  const filteredList = useMemo(() => {
    if (selectedFilter === 'all') return vitalsList;
    return vitalsList.filter((v) => v.type === selectedFilter);
  }, [vitalsList, selectedFilter]);

  // Submit New Log
  const handleSaveEntry = () => {
    const now = new Date();
    const dateStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let newEntry = null;

    if (formType === 'sugar') {
      if (!sugarVal.trim()) {
        showAlert('Required', 'Please enter your blood glucose reading.');
        return;
      }
      const evalRes = evaluateSugar(sugarVal, sugarContext);
      newEntry = {
        id: `v-${Date.now()}`,
        type: 'sugar',
        title: `Blood Sugar (${sugarContext})`,
        value: sugarVal.trim(),
        unit: 'mg/dL',
        subType: sugarContext,
        status: evalRes.status,
        statusColor: evalRes.color,
        statusBg: evalRes.bg,
        date: dateStr,
        timestamp: Date.now(),
        patient: activePatient,
        notes: notesVal.trim() || `${sugarContext} reading`,
      };
    } else if (formType === 'bp') {
      if (!bpSystolic.trim() || !bpDiastolic.trim()) {
        showAlert('Required', 'Please enter both Systolic and Diastolic blood pressure values.');
        return;
      }
      const evalRes = evaluateBP(bpSystolic, bpDiastolic);
      newEntry = {
        id: `v-${Date.now()}`,
        type: 'bp',
        title: 'Blood Pressure',
        value: `${bpSystolic.trim()}/${bpDiastolic.trim()}`,
        systolic: bpSystolic.trim(),
        diastolic: bpDiastolic.trim(),
        pulse: pulseVal.trim() || '72',
        unit: 'mmHg',
        status: evalRes.status,
        statusColor: evalRes.color,
        statusBg: evalRes.bg,
        date: dateStr,
        timestamp: Date.now(),
        patient: activePatient,
        notes: notesVal.trim() || (pulseVal ? `Pulse: ${pulseVal} bpm` : 'Self BP Monitor'),
      };
    } else if (formType === 'spo2') {
      if (!spo2Val.trim()) {
        showAlert('Required', 'Please enter your SpO2 percentage reading.');
        return;
      }
      const evalRes = evaluateSpO2(spo2Val);
      newEntry = {
        id: `v-${Date.now()}`,
        type: 'spo2',
        title: 'Oxygen (SpO2)',
        value: spo2Val.trim(),
        unit: '%',
        status: evalRes.status,
        statusColor: evalRes.color,
        statusBg: evalRes.bg,
        date: dateStr,
        timestamp: Date.now(),
        patient: activePatient,
        notes: notesVal.trim() || 'Finger pulse oximeter',
      };
    } else if (formType === 'temp') {
      if (!tempVal.trim()) {
        showAlert('Required', 'Please enter your body temperature in °F.');
        return;
      }
      const evalRes = evaluateTemp(tempVal);
      newEntry = {
        id: `v-${Date.now()}`,
        type: 'temp',
        title: 'Body Temperature',
        value: tempVal.trim(),
        unit: '°F',
        status: evalRes.status,
        statusColor: evalRes.color,
        statusBg: evalRes.bg,
        date: dateStr,
        timestamp: Date.now(),
        patient: activePatient,
        notes: notesVal.trim() || 'Digital thermometer reading',
      };
    } else if (formType === 'weight') {
      if (!weightVal.trim()) {
        showAlert('Required', 'Please enter your weight in kg.');
        return;
      }
      const effectiveCm = heightUnit === 'cm' ? (heightVal.trim() || '170') : convertFtInToCm(heightFeet, heightInches);
      const evalRes = evaluateBMI(weightVal, effectiveCm || '170');
      const ftInObj = convertCmToFtIn(effectiveCm || '170');
      const heightDisplay = `${effectiveCm} cm (${ftInObj.feet}'${ftInObj.inches}")`;

      newEntry = {
        id: `v-${Date.now()}`,
        type: 'weight',
        title: 'Weight & BMI',
        value: weightVal.trim(),
        height: heightDisplay,
        heightCm: effectiveCm,
        heightFt: `${ftInObj.feet} ft ${ftInObj.inches} in`,
        bmi: evalRes.bmi,
        unit: 'kg',
        status: evalRes.status,
        statusColor: evalRes.color,
        statusBg: evalRes.bg,
        date: dateStr,
        timestamp: Date.now(),
        patient: activePatient,
        notes: notesVal.trim() || `Height: ${heightDisplay} • BMI: ${evalRes.bmi}`,
      };
    }

    if (newEntry) {
      const updated = [newEntry, ...vitalsList];
      saveVitals(updated);
      setModalVisible(false);
      resetForm();
      showAlert('Vitals Logged', `Successfully updated your ${PARAM_CONFIG[formType].name} report.`);
    }
  };

  const resetForm = () => {
    setSugarVal('');
    setBpSystolic('');
    setBpDiastolic('');
    setPulseVal('');
    setSpo2Val('');
    setTempVal('');
    setWeightVal('');
    setNotesVal('');
  };

  const handleDeleteEntry = (id) => {
    showAlert('Delete Reading', 'Are you sure you want to remove this health record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = vitalsList.filter((v) => v.id !== id);
          saveVitals(updated);
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={isDarkMode ? theme.text : "#1E293B"} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Self Health Monitor</Text>
            <Text style={styles.headerSubtitle}>Log & track your Sugar, BP, SpO2 & Vitals</Text>
          </View>

          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addHeaderBtnText}>Log Vital</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.webContainer}>
          {/* PATIENT PROFILE CHIP */}
        <View style={styles.patientBanner}>
          <View style={styles.patientInfo}>
            <View style={styles.patientAvatarIcon}>
              <Ionicons name="person" size={16} color="#13BE9C" />
            </View>
            <Text style={styles.patientText}>Monitoring for: <Text style={styles.patientBold}>{activePatient}</Text></Text>
          </View>
          <TouchableOpacity
            style={styles.switchPatientBtn}
            onPress={() => {
              const options = familyOptions && familyOptions.length > 0 ? familyOptions : ['Self'];
              const nextIdx = (options.indexOf(activePatient) + 1) % options.length;
              setActivePatient(options[nextIdx]);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={13} color="#13BE9C" />
            <Text style={styles.switchPatientText}>Switch Patient</Text>
          </TouchableOpacity>
        </View>

        {/* VITALS OVERVIEW GRID */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Health Snapshot</Text>
          <Text style={styles.sectionSub}>Your latest self-tested readings</Text>
        </View>

        <View style={styles.gridContainer}>
          {/* BLOOD SUGAR */}
          <TouchableOpacity
            style={[styles.vitalsCard, { borderColor: '#FFD7C7' }]}
            onPress={() => {
              setFormType('sugar');
              setModalVisible(true);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF2ED' }]}>
                <Ionicons name="water" size={20} color="#FF7F50" />
              </View>
              <View style={[styles.badge, { backgroundColor: latestVitals.sugar.statusBg || '#F2FAF0' }]}>
                <Text style={[styles.badgeText, { color: latestVitals.sugar.statusColor || '#7BC96F' }]}>
                  {latestVitals.sugar.status}
                </Text>
              </View>
            </View>
            <Text style={styles.vitalsLabel}>Blood Sugar</Text>
            <View style={styles.valueRow}>
              <Text style={styles.vitalsValue}>{latestVitals.sugar.value}</Text>
              <Text style={styles.vitalsUnit}> {latestVitals.sugar.unit}</Text>
            </View>
            <Text style={styles.vitalsDate}>{latestVitals.sugar.date || 'Tap + to log'}</Text>
          </TouchableOpacity>

          {/* BLOOD PRESSURE */}
          <TouchableOpacity
            style={[styles.vitalsCard, { borderColor: '#FFD7C7' }]}
            onPress={() => {
              setFormType('bp');
              setModalVisible(true);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF2ED' }]}>
                <Ionicons name="heart" size={20} color="#FF7F50" />
              </View>
              <View style={[styles.badge, { backgroundColor: latestVitals.bp.statusBg || '#F2FAF0' }]}>
                <Text style={[styles.badgeText, { color: latestVitals.bp.statusColor || '#7BC96F' }]}>
                  {latestVitals.bp.status}
                </Text>
              </View>
            </View>
            <Text style={styles.vitalsLabel}>Blood Pressure (BP)</Text>
            <View style={styles.valueRow}>
              <Text style={styles.vitalsValue}>{latestVitals.bp.value}</Text>
              <Text style={styles.vitalsUnit}> {latestVitals.bp.unit}</Text>
            </View>
            <Text style={styles.vitalsDate}>{latestVitals.bp.date || 'Tap + to log'}</Text>
          </TouchableOpacity>

          {/* OXYGEN SPO2 */}
          <TouchableOpacity
            style={[styles.vitalsCard, { borderColor: '#BAE6FD' }]}
            onPress={() => {
              setFormType('spo2');
              setModalVisible(true);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F7FA' }]}>
                <Ionicons name="pulse" size={20} color="#00C2CB" />
              </View>
              <View style={[styles.badge, { backgroundColor: latestVitals.spo2.statusBg || '#F2FAF0' }]}>
                <Text style={[styles.badgeText, { color: latestVitals.spo2.statusColor || '#7BC96F' }]}>
                  {latestVitals.spo2.status}
                </Text>
              </View>
            </View>
            <Text style={styles.vitalsLabel}>Oxygen (SpO2)</Text>
            <View style={styles.valueRow}>
              <Text style={styles.vitalsValue}>{latestVitals.spo2.value}</Text>
              <Text style={styles.vitalsUnit}> {latestVitals.spo2.unit}</Text>
            </View>
            <Text style={styles.vitalsDate}>{latestVitals.spo2.date || 'Tap + to log'}</Text>
          </TouchableOpacity>

          {/* TEMPERATURE */}
          <TouchableOpacity
            style={[styles.vitalsCard, { borderColor: '#BFDBFE' }]}
            onPress={() => {
              setFormType('temp');
              setModalVisible(true);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="thermometer" size={20} color="#1E3A8A" />
              </View>
              <View style={[styles.badge, { backgroundColor: latestVitals.temp.statusBg || '#F2FAF0' }]}>
                <Text style={[styles.badgeText, { color: latestVitals.temp.statusColor || '#7BC96F' }]}>
                  {latestVitals.temp.status}
                </Text>
              </View>
            </View>
            <Text style={styles.vitalsLabel}>Body Temp</Text>
            <View style={styles.valueRow}>
              <Text style={styles.vitalsValue}>{latestVitals.temp.value}</Text>
              <Text style={styles.vitalsUnit}> {latestVitals.temp.unit}</Text>
            </View>
            <Text style={styles.vitalsDate}>{latestVitals.temp.date || 'Tap + to log'}</Text>
          </TouchableOpacity>

          {/* WEIGHT, HEIGHT & BMI */}
          <TouchableOpacity
            style={[styles.vitalsCard, styles.weightHeightCard]}
            onPress={() => {
              setFormType('weight');
              setModalVisible(true);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.iconCircle, { backgroundColor: '#F2FAF0' }]}>
                  <Ionicons name="scale" size={20} color="#7BC96F" />
                </View>
                <View>
                  <Text style={styles.vitalsLabel}>Weight & Height</Text>
                  <Text style={styles.weightSubLabel}>Body Composition & BMI</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: latestVitals.weight.statusBg || '#F2FAF0' }]}>
                <Text style={[styles.badgeText, { color: latestVitals.weight.statusColor || '#7BC96F' }]}>
                  {latestVitals.weight.status || 'Normal'}
                </Text>
              </View>
            </View>

            {/* 3-Column Metrics: Weight | Height (cm + ft) | BMI */}
            <View style={styles.weightHeightGrid}>
              <View style={styles.metricColumn}>
                <Text style={styles.metricTitle}>Weight</Text>
                <View style={styles.valueRow}>
                  <Text style={styles.vitalsValue}>{latestVitals.weight.value}</Text>
                  <Text style={styles.vitalsUnit}> {latestVitals.weight.unit || 'kg'}</Text>
                </View>
                <Text style={styles.metricSubInfo}>Body Mass</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricColumn}>
                <Text style={styles.metricTitle}>Height</Text>
                <View style={styles.valueRow}>
                  <Text style={styles.vitalsValue}>{latestVitals.weight.heightInfo?.cm || '172'}</Text>
                  <Text style={styles.vitalsUnit}> cm</Text>
                </View>
                <Text style={styles.heightFtSubText}>
                  {latestVitals.weight.heightInfo?.ft ? `${latestVitals.weight.heightInfo.ft} ft/in` : "5'8\" ft/in"}
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricColumn}>
                <Text style={styles.metricTitle}>BMI Score</Text>
                <View style={styles.valueRow}>
                  <Text style={[styles.vitalsValue, { color: latestVitals.weight.statusColor || '#7BC96F' }]}>
                    {latestVitals.weight.bmi || '23.0'}
                  </Text>
                </View>
                <Text style={[styles.metricSubInfo, { color: latestVitals.weight.statusColor || '#7BC96F', fontWeight: '700' }]}>
                  {latestVitals.weight.status || 'Normal'}
                </Text>
              </View>
            </View>

            <View style={styles.weightCardFooter}>
              <Text style={styles.vitalsDate}>{latestVitals.weight.date || 'Tap to update weight & height'}</Text>
              <Text style={styles.tapToEditHint}>Tap to update →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* LOG NEW VITAL ACTION BUTTON */}
        <TouchableOpacity
          style={styles.mainActionBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.mainActionText}>+ Update New Health Report</Text>
        </TouchableOpacity>

        {/* HEALTH TIPS & GUIDANCE */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={22} color="#F59E0B" />
            <Text style={styles.tipsTitle}>Personalized Doctor Tips</Text>
          </View>
          <Text style={styles.tipsBody}>
            • For accurate Blood Sugar, test Fasting early morning before food (Normal: 70-99 mg/dL).{'\n'}
            • Rest for 5 minutes before checking Blood Pressure to avoid false high readings.{'\n'}
            • If Blood Sugar &gt; 180 or BP &gt; 140/90 repeatedly, consult our specialist doctor.
          </Text>
          <TouchableOpacity
            style={styles.consultDocBtn}
            onPress={() => navigation.navigate('DoctorList')}
          >
            <Text style={styles.consultDocText}>Consult Doctor Online →</Text>
          </TouchableOpacity>
        </View>

        {/* HISTORY & LOGS */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vitals History Log</Text>
            <Text style={styles.sectionSub}>All saved self-tests</Text>
          </View>

          {/* FILTER CHIPS */}
          {Platform.OS === 'web' ? (
            <View style={styles.filterWrap}>
              {[
                { id: 'all', label: 'All Vitals' },
                { id: 'sugar', label: 'Sugar' },
                { id: 'bp', label: 'Blood Pressure' },
                { id: 'spo2', label: 'SpO2' },
                { id: 'temp', label: 'Temperature' },
                { id: 'weight', label: 'Weight' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, selectedFilter === f.id && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f.id)}
                >
                  <Text style={[styles.filterText, selectedFilter === f.id && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {[
                { id: 'all', label: 'All Vitals' },
                { id: 'sugar', label: 'Sugar' },
                { id: 'bp', label: 'Blood Pressure' },
                { id: 'spo2', label: 'SpO2' },
                { id: 'temp', label: 'Temperature' },
                { id: 'weight', label: 'Weight' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, selectedFilter === f.id && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f.id)}
                >
                  <Text style={[styles.filterText, selectedFilter === f.id && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* LIST */}
          {filteredList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No records in this category</Text>
              <Text style={styles.emptySub}>Tap '+ Update New Health Report' to add a test.</Text>
            </View>
          ) : (
            filteredList.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={[styles.historyIcon, { backgroundColor: PARAM_CONFIG[item.type]?.bg || '#EEF2FF' }]}>
                  <Ionicons
                    name={PARAM_CONFIG[item.type]?.icon || 'pulse'}
                    size={20}
                    color={PARAM_CONFIG[item.type]?.iconColor || colors.primary}
                  />
                </View>

                <View style={styles.historyDetails}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <View style={[styles.badge, { backgroundColor: item.statusBg || '#F2FAF0' }]}>
                      <Text style={[styles.badgeText, { color: item.statusColor || '#7BC96F' }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.historyValue}>
                    {item.value} <Text style={styles.historyUnit}>{item.unit}</Text>
                    {item.type === 'weight' && item.height ? (
                      <Text style={styles.historyHeightTag}>
                        {` • Height: ${item.height}`}
                        {item.bmi ? ` (BMI ${item.bmi})` : ''}
                      </Text>
                    ) : null}
                    {item.pulse ? ` • Pulse: ${item.pulse} bpm` : ''}
                  </Text>

                  <View style={styles.historyMetaRow}>
                    <Text style={styles.historyDate}>
                      <Ionicons name="time-outline" size={12} color="#64748B" /> {item.date}
                    </Text>
                    <Text style={styles.historyPatient}>• For: {item.patient}</Text>
                  </View>
                  {item.notes ? <Text style={styles.historyNotes}>Note: {item.notes}</Text> : null}
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteEntry(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        </View>

        {/* WEB FOOTER */}
        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* ==================================================
          LOGGING MODAL
      ================================================== */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Health Report</Text>
                <Text style={styles.modalSubtitle}>Enter your self-tested reading</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* PARAMETER SELECTOR TABS */}
              <Text style={styles.inputLabel}>Select Health Test</Text>
              <View style={styles.paramTabsRow}>
                {Object.keys(PARAM_CONFIG).map((key) => {
                  const conf = PARAM_CONFIG[key];
                  const isSelected = formType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.paramTab,
                        isSelected && { borderColor: conf.iconColor, backgroundColor: conf.bg },
                      ]}
                      onPress={() => setFormType(key)}
                    >
                      <Ionicons
                        name={conf.icon}
                        size={18}
                        color={isSelected ? conf.iconColor : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.paramTabText,
                          isSelected && { color: conf.iconColor, fontWeight: '700' },
                        ]}
                      >
                        {conf.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* SPECIFIC PARAMETER FORM INPUTS */}
              {formType === 'sugar' && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Test Timing / Context</Text>
                  <View style={styles.contextRow}>
                    {['Fasting', 'Post-Meal (PP)', 'Random', 'Bedtime'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.contextChip,
                          sugarContext === c && styles.contextChipActive,
                        ]}
                        onPress={() => setSugarContext(c)}
                      >
                        <Text
                          style={[
                            styles.contextText,
                            sugarContext === c && styles.contextTextActive,
                          ]}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Glucose Level (mg/dL)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="e.g. 95"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={sugarVal}
                      onChangeText={setSugarVal}
                    />
                    <Text style={styles.unitSuffix}>mg/dL</Text>
                  </View>
                  <Text style={styles.helperText}>
                    Normal Fasting: 70–99 mg/dL | Normal Post-Meal: &lt;140 mg/dL
                  </Text>
                </View>
              )}

              {formType === 'bp' && (
                <View style={styles.formGroup}>
                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Systolic (High)</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.mainInput}
                          placeholder="120"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={bpSystolic}
                          onChangeText={setBpSystolic}
                        />
                        <Text style={styles.unitSuffix}>mmHg</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.inputLabel}>Diastolic (Low)</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.mainInput}
                          placeholder="80"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={bpDiastolic}
                          onChangeText={setBpDiastolic}
                        />
                        <Text style={styles.unitSuffix}>mmHg</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Pulse / Heart Rate (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="e.g. 72"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={pulseVal}
                      onChangeText={setPulseVal}
                    />
                    <Text style={styles.unitSuffix}>bpm</Text>
                  </View>
                  <Text style={styles.helperText}>Normal resting BP is below 120/80 mmHg.</Text>
                </View>
              )}

              {formType === 'spo2' && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Blood Oxygen Saturation (%)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="e.g. 98"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={spo2Val}
                      onChangeText={setSpo2Val}
                    />
                    <Text style={styles.unitSuffix}>%</Text>
                  </View>
                  <Text style={styles.helperText}>Healthy normal SpO2 is 95% to 100%.</Text>
                </View>
              )}

              {formType === 'temp' && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Body Temperature (°F)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="e.g. 98.6"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={tempVal}
                      onChangeText={setTempVal}
                    />
                    <Text style={styles.unitSuffix}>°F</Text>
                  </View>
                  <Text style={styles.helperText}>Normal human body temp is ~98.6°F (37°C).</Text>
                </View>
              )}

              {formType === 'weight' && (
                <View style={styles.formGroup}>
                  {/* WEIGHT INPUT */}
                  <Text style={styles.inputLabel}>Body Weight (kg)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="e.g. 68"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={weightVal}
                      onChangeText={setWeightVal}
                    />
                    <Text style={styles.unitSuffix}>kg</Text>
                  </View>

                  {/* HEIGHT HEADER WITH CM / FT TOGGLE */}
                  <View style={styles.heightHeaderRow}>
                    <Text style={styles.inputLabel}>Body Height</Text>
                    <View style={styles.unitTogglePill}>
                      <TouchableOpacity
                        style={[
                          styles.unitToggleBtn,
                          heightUnit === 'cm' && styles.unitToggleBtnActive,
                        ]}
                        onPress={() => handleUnitToggle('cm')}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.unitToggleText,
                            heightUnit === 'cm' && styles.unitToggleTextActive,
                          ]}
                        >
                          cm
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.unitToggleBtn,
                          heightUnit === 'ft' && styles.unitToggleBtnActive,
                        ]}
                        onPress={() => handleUnitToggle('ft')}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.unitToggleText,
                            heightUnit === 'ft' && styles.unitToggleTextActive,
                          ]}
                        >
                          ft / in
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* HEIGHT INPUTS BASED ON UNIT */}
                  {heightUnit === 'cm' ? (
                    <View>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.mainInput}
                          placeholder="e.g. 172"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={heightVal}
                          onChangeText={handleHeightCmChange}
                        />
                        <Text style={styles.unitSuffix}>cm</Text>
                      </View>
                      {heightVal ? (
                        <Text style={styles.helperText}>
                          ≈ {heightFeet} ft {heightInches} in
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View>
                      <View style={styles.rowInputs}>
                        <View style={{ flex: 1, marginRight: 6 }}>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.mainInput}
                              placeholder="5"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={heightFeet}
                              onChangeText={handleHeightFeetChange}
                            />
                            <Text style={styles.unitSuffix}>ft</Text>
                          </View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 6 }}>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.mainInput}
                              placeholder="8"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={heightInches}
                              onChangeText={handleHeightInchesChange}
                            />
                            <Text style={styles.unitSuffix}>in</Text>
                          </View>
                        </View>
                      </View>
                      {heightVal ? (
                        <Text style={styles.helperText}>
                          ≈ {heightVal} cm
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* LIVE BMI PREVIEW */}
                  {weightVal ? (
                    <View style={styles.liveBmiCard}>
                      <View style={styles.liveBmiLeft}>
                        <Ionicons name="calculator-outline" size={18} color="#059669" />
                        <Text style={styles.liveBmiLabel}>Calculated BMI:</Text>
                        <Text style={styles.liveBmiValue}>
                          {evaluateBMI(weightVal, heightUnit === 'cm' ? (heightVal || '170') : convertFtInToCm(heightFeet, heightInches)).bmi}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.liveBmiBadge,
                          {
                            backgroundColor: evaluateBMI(weightVal, heightUnit === 'cm' ? (heightVal || '170') : convertFtInToCm(heightFeet, heightInches)).bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.liveBmiBadgeText,
                            {
                              color: evaluateBMI(weightVal, heightUnit === 'cm' ? (heightVal || '170') : convertFtInToCm(heightFeet, heightInches)).color,
                            },
                          ]}
                        >
                          {evaluateBMI(weightVal, heightUnit === 'cm' ? (heightVal || '170') : convertFtInToCm(heightFeet, heightInches)).status}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.helperText}>BMI will be automatically computed upon saving.</Text>
                  )}
                </View>
              )}

              {/* NOTES */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Add Notes / Symptoms (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g. Felt dizzy, taken after 30m walk"
                placeholderTextColor="#94A3B8"
                value={notesVal}
                onChangeText={setNotesVal}
              />

              {/* SAVE BUTTON */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveEntry}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSubmitText}>Save Health Record</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
  },
  headerInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#13BE9C', // Brand Green
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#13BE9C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  addHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: Platform.OS === 'web' ? 0 : 110,
  },
  webContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  patientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0', // Fresh Mint
    marginBottom: 16,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientAvatarIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientText: {
    fontSize: 13,
    color: '#64748B',
  },
  patientBold: {
    fontWeight: '800',
    color: '#1E293B',
  },
  switchPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  switchPatientText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#13BE9C',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  vitalsCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  vitalsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  vitalsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  vitalsUnit: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  vitalsDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  mainActionBtn: {
    backgroundColor: '#13BE9C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 20,
    shadowColor: '#13BE9C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  mainActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tipsCard: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  tipsBody: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 12,
  },
  consultDocBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  consultDocText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  historySection: {
    marginTop: 4,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    rowGap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  historyValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 2,
  },
  historyUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#64748B',
  },
  historyPatient: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  historyNotes: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  paramTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  paramTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  paramTabText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 12,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  contextChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  contextChipActive: {
    backgroundColor: colors.primary,
  },
  contextText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  contextTextActive: {
    color: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  mainInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  unitSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 20,
  },
  heightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  unitTogglePill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  unitToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  unitToggleTextActive: {
    color: '#FFFFFF',
  },
  liveBmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  liveBmiLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBmiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  liveBmiValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#15803D',
  },
  liveBmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveBmiBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  weightHeightCard: {
    width: '100%',
    borderColor: '#BBF7D0',
    backgroundColor: '#FFFFFF',
  },
  weightSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  weightHeightGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricSubInfo: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  heightFtSubText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  weightCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tapToEditHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  historyHeightTag: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F766E',
  },
});

export default HealthMonitorScreen;
