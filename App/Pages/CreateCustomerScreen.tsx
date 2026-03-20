import React, { useState, useEffect } from 'react';
import {
View,
Text,
StyleSheet,
TextInput,
TouchableOpacity,
ScrollView,
Alert,
Switch,
KeyboardAvoidingView,
Platform,
Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SyncIndicator from '../Components/SyncIndicator';
import {
saveClient,
useNetworkStatus,
getPendingSyncItems
} from '../utils/NetworkManager';
import Footer from '../Components/Footer';

const { width } = Dimensions.get("window");

export default function CreateCustomerScreen({ navigation }) {

const insets = useSafeAreaInsets();

const { isConnected, isInternetReachable } = useNetworkStatus();
const [pendingSyncCount, setPendingSyncCount] = useState(0);
const [isSyncing, setIsSyncing] = useState(false);

const [name,setName]=useState('');
const [phone,setPhone]=useState('');
const [email,setEmail]=useState('');
const [address,setAddress]=useState('');
const [gstNo,setGstNo]=useState('');
const [isGstRegistered,setIsGstRegistered]=useState(false);
const [isSaving,setIsSaving]=useState(false);

const [customerFieldSettings,setCustomerFieldSettings]=useState({
address:false,
emailId:false,
gstNo:false
});

useEffect(()=>{
loadCustomerFieldSettings();
updatePendingSyncCount();
},[]);

const updatePendingSyncCount=async()=>{
try{
const pendingItems=await getPendingSyncItems();
setPendingSyncCount(pendingItems.length);
}catch(e){}
};

useEffect(()=>{
if(isConnected && isInternetReachable){
const checkSync=async()=>{
const pending=await getPendingSyncItems();
if(pending.length>0){
setIsSyncing(true);
setTimeout(()=>{
setIsSyncing(false);
updatePendingSyncCount();
},3000);
}
};
checkSync();
}
},[isConnected,isInternetReachable]);

const loadCustomerFieldSettings=async()=>{
try{
const cachedSettings=await AsyncStorage.getItem('@viveha_customer_field_settings');
if(cachedSettings){
setCustomerFieldSettings(JSON.parse(cachedSettings));
}
}catch(e){}
};

const validateInputs=()=>{

if(!name.trim()){
Alert.alert('Error','Please enter customer name');
return false;
}

if(!phone.trim()){
Alert.alert('Error','Please enter phone number');
return false;
}

if(phone.length!==10){
Alert.alert('Error','Phone number must be exactly 10 digits');
return false;
}

return true;
};

const handleSaveCustomer=async()=>{

if(!validateInputs()) return;

try{

setIsSaving(true);

const customerData:any={
name:name.trim(),
phone:phone.trim()
};

if(customerFieldSettings.address && address.trim()){
customerData.address=address.trim();
}

if(customerFieldSettings.emailId && email.trim()){
customerData.emailId=email.trim();
}

if(customerFieldSettings.gstNo && gstNo.trim()){
customerData.gstNo=gstNo.trim();
}

const result=await saveClient(customerData,false);

if(result.success){

Toast.show({
type:'success',
text1:'Success',
text2:'Customer created successfully',
position:'bottom'
});

navigation.goBack();

}else{
Alert.alert('Error','Failed to create customer');
}

}catch(error){

Alert.alert('Error','Failed to create customer');

}finally{
setIsSaving(false);
}

};

return(

<View style={styles.container}>

<SyncIndicator
isSyncing={isSyncing}
isOnline={isConnected && isInternetReachable}
pendingCount={pendingSyncCount}
/>

<View style={[styles.header,{paddingTop:insets.top}]}>
<TouchableOpacity onPress={()=>navigation.goBack()}>
<Ionicons name="arrow-back" size={24} color="#333"/>
</TouchableOpacity>

<Text style={styles.headerTitle}>Create Customer</Text>

<View style={{width:24}}/>
</View>

<KeyboardAvoidingView
behavior={Platform.OS==='ios'?'padding':'height'}
style={{flex:1}}
>

<ScrollView
showsVerticalScrollIndicator={false}
contentContainerStyle={{paddingBottom:120}}
>

{/* CENTERED CONTENT */}
<View style={styles.pageWrapper}>

<View style={styles.card}>

<View style={styles.inputGroup}>
<Text style={styles.label}>Full Name</Text>

<TextInput
style={styles.input}
placeholder="eg.Mohan Kumar"
value={name}
onChangeText={setName}
/>

</View>

<View style={styles.inputGroup}>
<Text style={styles.label}>Phone Number</Text>

<TextInput
style={styles.input}
placeholder="+91 98765 43210"
value={phone}
keyboardType="numeric"
maxLength={10}
onChangeText={(text)=>{
const numericText=text.replace(/[^0-9]/g,'');
setPhone(numericText);
}}
/>

</View>

{customerFieldSettings.emailId && (

<View style={styles.inputGroup}>
<Text style={styles.label}>Email Address</Text>

<TextInput
style={styles.input}
placeholder="customer@gmail.com"
value={email}
onChangeText={setEmail}
/>

</View>

)}

</View>

{customerFieldSettings.address && (

<View style={styles.card}>

<View style={styles.inputGroup}>
<Text style={styles.label}>Full Address</Text>

<TextInput
style={[styles.input,styles.textArea]}
placeholder="House No, Street, City, Pincode"
value={address}
multiline
onChangeText={setAddress}
/>

</View>

</View>

)}

{customerFieldSettings.gstNo && (

<View style={styles.card}>

<View style={styles.inputGroup}>
<Text style={styles.label}>GST Number</Text>

<TextInput
style={styles.input}
placeholder="Enter GST Number"
value={gstNo}
onChangeText={setGstNo}
/>

</View>

</View>

)}

</View>

</ScrollView>

{/* FIXED SAVE BUTTON */}
<View style={[styles.saveContainer,{paddingBottom:insets.bottom+60}]}>

<TouchableOpacity
style={[styles.saveButton,isSaving && styles.saveButtonDisabled]}
onPress={handleSaveCustomer}
disabled={isSaving}
>

<Ionicons name="save-outline" size={20} color="#fff"/>

<Text style={styles.saveButtonText}>
{isSaving?'Saving...':'Save Customer'}
</Text>

</TouchableOpacity>

</View>

</KeyboardAvoidingView>

<Footer navigation={navigation} activeTab="Home"/>

</View>

);
}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:'#F5F5F5'
},

header:{
flexDirection:'row',
alignItems:'center',
justifyContent:'space-between',
paddingHorizontal:20,
paddingVertical:15
},

headerTitle:{
fontSize:18,
fontWeight:'600',
color:'#333',
flex:1,
textAlign:'center'
},

/* CENTER CONTENT WIDTH */
pageWrapper:{
alignItems:'center'
},

card:{
backgroundColor:'#FFF',
width:width*0.9,
marginTop:20,
borderRadius:16,
padding:18,
shadowColor:'#000',
shadowOpacity:0.04,
shadowRadius:6,
elevation:2
},

inputGroup:{
marginBottom:18
},

label:{
fontSize:14,
fontWeight:'600',
color:'#333',
marginBottom:8
},

input:{
backgroundColor:'#F7F7F7',
borderRadius:10,
paddingHorizontal:15,
paddingVertical:12,
fontSize:15,
borderWidth:1,
borderColor:'#EAEAEA'
},

textArea:{
height:80,
textAlignVertical:'top'
},

gstToggleContainer:{
flexDirection:'row',
alignItems:'center',
justifyContent:'space-between'
},

gstToggleLeft:{
flexDirection:'row',
alignItems:'center',
flex:1
},

gstToggleText:{
marginLeft:12,
flex:1
},

gstToggleTitle:{
fontSize:15,
fontWeight:'600',
color:'#333'
},

gstToggleSubtitle:{
fontSize:12,
color:'#999'
},

/* FIXED BUTTON */
saveContainer:{
position:'absolute',
bottom:0,
width:'100%',
alignItems:'center'
},

saveButton:{
flexDirection:'row',
alignItems:'center',
justifyContent:'center',
backgroundColor:'#F98648',
paddingVertical:15,
borderRadius:12,
gap:8,
width:width*0.9
},

saveButtonDisabled:{
backgroundColor:'#ccc'
},

saveButtonText:{
color:'#fff',
fontSize:16,
fontWeight:'600'
}

});