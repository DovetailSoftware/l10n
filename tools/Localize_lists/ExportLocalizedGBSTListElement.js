function echo(s){
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg){
	echo(err_msg + ", exiting.\n");
	echo("USAGE 1: CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name]");
	echo("USAGE 2: CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name_1,list_name_2,...]");
   WScript.Quit(-1);
}

function determineSeparator(aString) {
   var separatorIndex;
   var separators = [",","|",";",":","!","#","^",".","?","*","-","_"];
   for(separatorIndex in separators) {
      if(aString.indexOf(separators[separatorIndex]) < 0) return separators[separatorIndex];
   }
   return "\t";
};

var stdout = WScript.StdOut;
var constBOverwrite = true;
var constBUnicode = true;
var constSDefaultExt = ".txt";

var locale = WScript.Arguments.Named.Item("locale");
if(!locale) locale = new String();
if(locale == "" || !((/[a-z]{2}-[A-Z]{2}/).test(locale))) {
   show_usage_and_exit("locale parameter in 'xx-XX' format was not provided and is required");
}

var file_path = WScript.Arguments.Named.Item("path");
if(!file_path) file_path = new String();
file_path = file_path.replace(/[\/\\]+$/,"");
if(file_path.length != 0) file_path += "\\";
var outFile = null;

var list_name = WScript.Arguments.Named.Item("list");
if(!list_name) list_name = new String();

var list_name = WScript.Arguments.Named.Item("list");
if(!list_name) list_name = new String();

stdout.Write("Connecting to the database...");

var FCApp = WScript.CreateObject('FCFLCompat.FCApplication');
FCApp.Initialize();
var FCSession = FCApp.CreateSession();	
FCSession.LoginFromFCApp();
FCSession.SetNullStringsToEmpty = true;
var fso = new ActiveXObject("Scripting.FileSystemObject");

echo("\rExporting " + ((list_name == "") ? "all GBST lists'" : (list_name + " GBST list's")) + " strings for locale: " + locale);

var lists = list_name.split(",");
if(lists == "" || lists.length == 0) lists[0] = "*";

for(l in lists) {
   var boList = FCSession.CreateGeneric("gbst_lst");
   boList.DataFields = "title";
   if(lists[l] != "*") {
      boList.AppendFilter("title","=",lists[l]);
   }
   boList.AppendSort("title","asc");

   var boElm = FCSession.CreateGeneric("gbst_elm");
   boElm.DataFields = "title";
   boElm.TraverseFromParent(boList,"gbst_lst2gbst_elm");
   boElm.AppendSort("title","asc");
   var boLocElm = FCSession.CreateGeneric("fc_loc_elm");
   boLocElm.DataFields = "title,objid";
   boLocElm.TraverseFromParent(boElm,"gbst_elm2fc_loc_elm");
   boLocElm.AppendFilter("locale","=",locale);
   boList.Query();

   var localized = "";

   while(!boList.EOF) {
      list_name = boList("title") + "";
      var file_name = file_path + list_name.replace(/[\/\\\?\:\*"\<\>\|\.,']/g,"-") + "_GBST_" + locale + constSDefaultExt;
      outFile = fso.CreateTextFile(file_name, constBOverwrite, constBUnicode);
      if (outFile == null) {
         echo("unable to create output file: " + file_name);
         WScript.Quit(-1);
      }
      echo("Exporting '" + list_name + "' list to '" + file_name + "'");
      while(!boElm.EOF) {
         try { localized = boLocElm("title") + ""; } catch(e) { localized = ""; }
         var line = list_name + boElm("title") + localized;
         var separator = determineSeparator(line);
         outFile.writeLine(list_name + separator + boElm("title") + separator + locale + separator + localized);
         boElm.MoveNext();
      }
      outFile.Close();
      outFile = null;
      boList.MoveNext();
   }

   FCSession.CloseAllGenerics();
   boElm = null;
   boLocElm = null;
   boList = null;
}

FCSession.Logout();

//CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:pl-PL /list:"Case Type"
//CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:pl-PL /list:"Problem Severity Level,Case Type,Open,Closed,Response Priority Code"