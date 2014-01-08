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
   //boHgbstElm.AppendFilter("rank", "=",rank);
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

var file_name = WScript.Arguments.Named.Item("file");
if(!file_name) file_name = new String();
if(file_name == "") {
   show_usage_and_exit("file parameter was not provided and is required");
}

ifso = new ActiveXObject("Scripting.FileSystemObject");
inpf = ifso.OpenTextFile(file_name, constIForReading, constBCreate, constIUnicode);
if(!inpf) {
   show_usage_and_exit("Input file cannot be open or doesn't exist");
}

stdout.Write("Connecting to the database...");

var FCApp = WScript.CreateObject('FCFLCompat.FCApplication');
FCApp.Initialize();
var FCSession = FCApp.CreateSession();	
FCSession.LoginFromFCApp();

var boLocElm = FCSession.CreateGeneric('fc_loc_elm');
boLocElm.BulkName = "new_and_updated_strings";

echo("\rImporting HGBST lists' strings from file: " + file_name);

var list_name = "";
var bulkNum = 0;
var a = [];

while (! inpf.AtEndOfStream) {
   var ibuf = inpf.ReadLine();
   a = ibuf.replace(/\t/g,",").split(",");
   if(list_name != a[constIIndexOfListName]) {
      list_name = a[constIIndexOfListName];
      echo("Importing '" + list_name + "' list");
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

      FCSession.CloseAllGenerics();
      boHgbstShow = null;
      boHgbstLst = null;
   }
}

inpf.Close();

echo("\nFinished importing HGBST lists' localized strings.");

FCSession.CloseAllGenerics();
FCSession.Logout();

//CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:"Notification Types.txt"
