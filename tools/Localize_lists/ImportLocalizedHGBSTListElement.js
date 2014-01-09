function echo(s) {
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg) {
	echo(err_msg + ", exiting.\n");
	echo("USAGE: CScript //E:JScript [options] ImportLocalizedHGBSTListElement.js /file:full_path_to_input_file");
   WScript.Quit(-1);
}

function importAllShowsAndElmsForAList(boHgbstShow,elmObj,arrayIndex) {
   var showObjid = boHgbstShow("objid")+0;
   var elmObjid  = 0;
   var boLocElm  = null;
   var rank      = a[arrayIndex];
   var title     = a[arrayIndex + 1];
   var locale    = "";
   var localized = "";
   var nextIndex = arrayIndex + 2;
   var boHgbstElm = FCSession.CreateGeneric("hgbst_elm");
   boHgbstElm.TraverseFromParent(boHgbstShow, "hgbst_show2hgbst_elm");
   boHgbstElm.DataFields = "title,rank";
   boHgbstElm.BulkName = "hgbstelm_" + bulkNum++;
   boHgbstElm.AppendFilter("title","=",title);
   if(elmObj > 0) boHgbstElm.AppendFilter("objid", "<>", elmObj);

   if(arrayIndex == a.length-4) {
      locale    = a[arrayIndex + 2];
      localized = a[arrayIndex + 3];
      nextIndex = arrayIndex + 4;
      boLocElm = FCSession.CreateGeneric("fc_loc_elm");
      boLocElm.DataFields = "title";
      boLocElm.TraverseFromParent(boHgbstElm,"hgbst_elm2fc_loc_elm");
      boLocElm.AppendFilter("locale","=",locale);
      boLocElm.BulkName = boHgbstElm.BulkName;
   }

   boHgbstElm.Bulk.Query();

   if(!boHgbstElm.EOF) { 
      elmObjid = boHgbstElm.Id
      if(boLocElm) {
         if(boLocElm.Count() != 0) {
            boLocElm.AddForUpdate(boLocElm("objid")+0);
         } else {
            boLocElm.AddNew();
         }
         boLocElm("title")  = localized;
         boLocElm("locale") = locale;
         boLocElm.RelateById(boHgbstElm.Id, "fc_loc_elm2hgbst_elm");
         boLocElm.Update();
         boLocElm.CloseGeneric();
         boLocElm = null;
      }
   } else {
      echo("\nERROR: missing list element with rank: " + rank + ", title: " + title + " for list: " + list_name);
      return;
   }

   boHgbstElm.CloseGeneric();
   boHgbstElm = null;

   if(a.length > nextIndex) importAllShowsAndElmsForAnElm(elmObjid,showObjid,nextIndex);
}

function importAllShowsAndElmsForAnElm(elmObjid,showObjid,nextIndex) {
   var boHgbstParElm = FCSession.CreateGeneric("hgbst_elm");
   boHgbstParElm.AppendFilter("objid", "=", elmObjid);
   boHgbstParElm.BulkName = "hgbstshow_" + bulkNum++;
   var boHgbstChildShow = FCSession.CreateGeneric("hgbst_show");
   boHgbstChildShow.BulkName = boHgbstParElm.BulkName;
   boHgbstChildShow.TraverseFromParent(boHgbstParElm, "hgbst_elm2hgbst_show");
   boHgbstChildShow.AppendFilter("objid", "<>", showObjid);
   boHgbstChildShow.Query();
   if(boHgbstChildShow.Count() > 0) {
      importAllShowsAndElmsForAList(boHgbstChildShow,elmObjid,nextIndex);
   }
   boHgbstChildShow.CloseGeneric();
   boHgbstChildShow = null;
   boHgbstParElm.CloseGeneric();
   boHgbstParElm = null;
}

var stdout = WScript.StdOut;

var constIForReading = 1;
var constBCreate = false;
var constIUnicode = -1;
var constIIndexOfListName = 0;
var bulkNum = 0;

var file_name = WScript.Arguments.Named.Item("file");
if(!file_name) file_name = new String();
if(file_name == "") {
   show_usage_and_exit("file parameter was not provided and is required");
}

stdout.Write("Connecting to the database...");

var FCApp = WScript.CreateObject('FCFLCompat.FCApplication');
FCApp.Initialize();
var FCSession = FCApp.CreateSession();	
FCSession.LoginFromFCApp();
ifso = new ActiveXObject("Scripting.FileSystemObject");

echo("\rImporting HGBST lists' strings from file(s): " + file_name + "\n");
var files = file_name.split(",");

for(l in files) {
   file_name = files[l];
   inpf = ifso.OpenTextFile(file_name, constIForReading, constBCreate, constIUnicode);
   if(!inpf) {
      show_usage_and_exit("Input file: '" + file_name + "' cannot be open or doesn't exist");
   }

   var list_name = "";
   var a = [];

   while (! inpf.AtEndOfStream) {
      var ibuf = inpf.ReadLine();
      a = ibuf.replace(/\t/g,",").split(",");
      if(list_name != a[constIIndexOfListName]) {
         list_name = a[constIIndexOfListName];
         echo("Importing '" + list_name + "' list from file '" + file_name + "'");
      }
      if((a.length-5) % 2 == 0) {
         var boHgbstLst = FCSession.CreateGeneric("hgbst_lst");
         boHgbstLst.BulkName = "hgbstlst_" + bulkNum++;
         boHgbstLst.AppendFilter("title","=",list_name);

         var boHgbstShow = FCSession.CreateGeneric("hgbst_show");
         boHgbstShow.TraverseFromParent(boHgbstLst, "hgbst_lst2hgbst_show");
         boHgbstShow.BulkName = boHgbstLst.BulkName;
         boHgbstLst.Bulk.Query();

         if(!boHgbstLst.EOF && !boHgbstShow.EOF) {
            importAllShowsAndElmsForAList(boHgbstShow,0,1);
         }

         boHgbstShow.CloseGeneric();
         boHgbstShow = null;
         boHgbstLst.CloseGeneric();
         boHgbstLst = null;
      }
   }

   inpf.Close();
}

echo("\nFinished importing HGBST lists' localized strings.");

inpf = null;
ifso = null;
FCSession.CloseAllGenerics();
FCSession.Logout();

//CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:"Notification Types_HGBST_pl-PL.csv"
//CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:"Contact Expertise_HGBST_pl-PL.csv,Contact Status_HGBST_pl-PL.csv,Email Types_HGBST_pl-PL.csv,Notification Types_HGBST_pl-PL.csv,Phone Types_HGBST_pl-PL.csv,Site Status_HGBST_pl-PL.csv,Site Type_HGBST_pl-PL.csv,Subcase Types_HGBST_pl-PL.csv,User Status_HGBST_pl-PL.csv,WORKGROUP_HGBST_pl-PL.csv"