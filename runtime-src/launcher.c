#include <mach-o/dyld.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <limits.h>

int main(void) {
  char executable[PATH_MAX], configuration[PATH_MAX], target[PATH_MAX], state[PATH_MAX];
  uint32_t size=sizeof(executable);
  if(_NSGetExecutablePath(executable,&size)!=0)return 2;
  char *last=strrchr(executable,'/');if(!last)return 2;*last=0;
  if(snprintf(configuration,sizeof(configuration),"%s/../Resources/launch.conf",executable)>=(int)sizeof(configuration))return 2;
  FILE *file=fopen(configuration,"r");if(!file)return 2;
  if(!fgets(target,sizeof(target),file)||!fgets(state,sizeof(state),file)){fclose(file);return 2;}fclose(file);
  target[strcspn(target,"\r\n")]=0;state[strcspn(state,"\r\n")]=0;
  if(target[0]!='/'||state[0]!='/')return 2;
  const char *keys[]={"HOME","USER","LOGNAME","TMPDIR","PATH","LANG","LC_ALL",NULL};
  char *environment[12];int count=0;
  for(int i=0;keys[i];i++){const char *value=getenv(keys[i]);if(value){size_t length=strlen(keys[i])+strlen(value)+2;char *entry=malloc(length);if(!entry)return 2;snprintf(entry,length,"%s=%s",keys[i],value);environment[count++]=entry;}}
  size_t length=strlen(state)+strlen("DSH_COMPANION_STATE_DIR=")+1;char *entry=malloc(length);if(!entry)return 2;snprintf(entry,length,"DSH_COMPANION_STATE_DIR=%s",state);environment[count++]=entry;
  environment[count++]="DSH_COMPANION_MODE=launcher";environment[count]=NULL;
  char *arguments[]={target,NULL};execve(target,arguments,environment);return 3;
}
