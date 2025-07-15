from ftplib import FTP
import io
from datetime import datetime, timedelta
def write_to_ftp(com_list):
    try:
        ftp = FTP('ftp.hostedftp.com')
        ftp.login(user='IOCC1', passwd='flyadeal@123')
        ftp.cwd('Operations/SITA/COM_IN')
    except Exception as er:
        print('ERROR Login'+ str(er) )
        raise er


    for com in com_list:
        time_data = com[24]
        print("time_data")
        print("time_data")
        print(time_data)
        format_data = "%d%b%y"

        # Parse Date
        date = datetime.strftime(time_data, format_data)


        try:
            ##### New file content
            # GEN
            # SKD
            # F3429/12Jun24 JED/HOF
            # SI MPAX=48.FPAX=32.CPAX=45.INF=6.TOB=125.END
            # SI PCS=48.BAG=877.END
            # SI REG=HZ-FAS.END
            # SI BOARDING FINALIZED
            # SI DEP/JED

            filename = 'LDM'+ str(com[4]) + str(com[2]) +str(date)+ str(com[0]) + str(com[1]) + '.txt'
            lines = [
            'GEN',
            'SKD',
            str(com[4]) + str(com[2]) + '/' + str(date) +' '+ str(com[0]) +'/' + str(com[1]),
            f'SI MPAX={str(com[7])}.FPAX={str(com[6])}.CPAX={str(com[8])}.INF={str(com[10])}.TOB={str(com[5])}.END' ,
            f'SI PCS={str(com[11])}.BAG={str(com[22])}.END',
            'SI REG='+str(com[25]),
            'SI ' + str(com[12]),
            'SI DEP/' + str(com[0])]


            print('Writing to file: ' + filename)

            ## This will write the file in binery without saving it
            file = io.BytesIO()
            file.write('\n'.join(lines).encode())
            file.seek(0)


            # Define the file name to save in the same directory

            # Save the BytesIO content to a file


            print('Ftp connected')
            print('Uploading file ' + filename + ' to FTP Server.')
            ftp.storbinary(f'STOR {filename}', file)
            print('File uploaded to FTP ')


        except Exception as er:
            print('ERROR Uploading'+ str(er) )
            print('Session RolledBack and closed')
            ftp.quit()
            raise er

    # Close the connection
    ftp.quit()